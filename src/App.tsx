/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  School, 
  User, 
  MapPin, 
  Users, 
  FileCheck, 
  Send, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  PlusCircle, 
  Printer, 
  Sparkles,
  Info,
  Phone,
  Mail,
  Heart,
  FileText,
  Lock,
  LogIn,
  LogOut,
  Upload,
  Download,
  Check,
  Copy,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FormState, FamiliarData } from './types';
import { initialFormState } from './initialState';
import { validateStep, ValidationErrors } from './validation';

// Import newly created modular views
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import AdminDashboardView from './components/AdminDashboardView';
import { getSeededRecords } from './utils/seedData';
import PrintableConstancia from './components/PrintableConstancia';
import { ShieldLogo } from './components/ShieldLogo';
import { downloadConstanciaPDF } from './utils/pdfGenerator';
import { 
  DISTRITOS, 
  SEDES_POR_DISTRITO, 
  GRADOS_INGRESO, 
  NIVELES_EDUCATIVOS, 
  TURNOS, 
  TIPOS_DOCUMENTO, 
  DEPARTAMENTOS, 
  PROVINCIAS, 
  DISTRITOS_DOMICILIO, 
  GRADOS_INSTRUCCION, 
  ESTADOS_CIVILES,
  GradoOption,
  DEFAULT_SEDE_ADDRESSES
} from './data';

import { getDepartamentos, getProvincias, getDistritos } from './utils/ubigeo';

function generateNextFamilyCode(existingRecords: any[]): string {
  const activeFamilyCodes = new Set<string>();
  existingRecords.forEach(r => {
    if (!r.isDeleted && r.formState?.fichaFamilia?.codigoFamilia) {
      activeFamilyCodes.add(r.formState.fichaFamilia.codigoFamilia.trim().toUpperCase());
    }
  });

  let n = 1;
  while (true) {
    const candidate = `FAM-${String(n).padStart(4, '0')}`;
    if (!activeFamilyCodes.has(candidate)) {
      return candidate;
    }
    n++;
  }
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeFamiliarTab, setActiveFamiliarTab] = useState<'papa' | 'mama' | 'apoderado'>('papa');
  const [apoderadoTipo, setApoderadoTipo] = useState<'papa' | 'mama' | 'otro'>('otro');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [declaroVeracidad, setDeclaroVeracidad] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isFormSimple, setIsFormSimple] = useState<boolean>(true);

  // States for Login and Student Session
  const [activeView, setActiveView] = useState<'form' | 'login' | 'dashboard'>('form');
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [newlyRegisteredCredentials, setNewlyRegisteredCredentials] = useState<{ username: string; password: string } | null>(null);
  const [siblingFamilyCode, setSiblingFamilyCode] = useState<string | null>(null);

  // Dynamic state for districts and headquarter branches
  const [districtsList, setDistrictsList] = useState<string[]>(() => {
    const stored = localStorage.getItem('jc_dynamic_distritos');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [...DISTRITOS];
  });

  const [sedesMap, setSedesMap] = useState<Record<string, string[]>>(() => {
    const stored = localStorage.getItem('jc_dynamic_sedes_map');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return { ...SEDES_POR_DISTRITO };
  });

  const [gradosList, setGradosList] = useState<GradoOption[]>(() => {
    const stored = localStorage.getItem('jc_dynamic_grados');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [...GRADOS_INGRESO];
  });

  const [sedeLevels, setSedeLevels] = useState<Record<string, string[]>>(() => {
    const stored = localStorage.getItem('jc_sede_levels');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    const defaults: Record<string, string[]> = {};
    Object.values(SEDES_POR_DISTRITO).flat().forEach(sede => {
      defaults[sede] = [...NIVELES_EDUCATIVOS];
    });
    return defaults;
  });

  const [sedeCapacities, setSedeCapacities] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('jc_sede_capacities');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    const defaults: Record<string, number> = {};
    Object.values(SEDES_POR_DISTRITO).flat().forEach(sede => {
      defaults[sede] = 120;
    });
    return defaults;
  });

  const [sedeAddresses, setSedeAddresses] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('jc_sede_addresses');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return { ...DEFAULT_SEDE_ADDRESSES };
  });

  const [admissionFee, setAdmissionFee] = useState<number>(() => {
    const stored = localStorage.getItem('jc_admission_fee');
    return stored ? parseFloat(stored) : 150.00;
  });

  const [admissionFeeActive, setAdmissionFeeActive] = useState<boolean>(() => {
    const stored = localStorage.getItem('jc_admission_fee_active');
    return stored ? stored === 'true' : true;
  });

  // Synchronize dynamic lists to localStorage on changes
  useEffect(() => {
    localStorage.setItem('jc_dynamic_distritos', JSON.stringify(districtsList));
  }, [districtsList]);

  useEffect(() => {
    localStorage.setItem('jc_dynamic_sedes_map', JSON.stringify(sedesMap));
  }, [sedesMap]);

  useEffect(() => {
    localStorage.setItem('jc_dynamic_grados', JSON.stringify(gradosList));
  }, [gradosList]);

  useEffect(() => {
    localStorage.setItem('jc_sede_levels', JSON.stringify(sedeLevels));
  }, [sedeLevels]);

  useEffect(() => {
    localStorage.setItem('jc_sede_capacities', JSON.stringify(sedeCapacities));
  }, [sedeCapacities]);

  useEffect(() => {
    localStorage.setItem('jc_sede_addresses', JSON.stringify(sedeAddresses));
  }, [sedeAddresses]);

  useEffect(() => {
    localStorage.setItem('jc_admission_fee', admissionFee.toString());
  }, [admissionFee]);

  useEffect(() => {
    localStorage.setItem('jc_admission_fee_active', admissionFeeActive.toString());
  }, [admissionFeeActive]);

  // Read allowed levels for the selected Sede dynamically and reactively
  const allowedLevelsForSelectedSede = React.useMemo(() => {
    const selectedSede = formState.postulacion.sedeLocal;
    if (!selectedSede) return [...NIVELES_EDUCATIVOS];
    return sedeLevels[selectedSede] || [...NIVELES_EDUCATIVOS];
  }, [formState.postulacion.sedeLocal, sedeLevels]);

  // Extract primitive fields to watch for syncing "Apoderado Principal"
  const papaNombres = formState.padresTutores.papa.nombres;
  const papaApePat = formState.padresTutores.papa.apellidoPaterno;
  const papaApeMat = formState.padresTutores.papa.apellidoMaterno;
  const papaTipoDoc = formState.padresTutores.papa.tipoDocumento;
  const papaNumDoc = formState.padresTutores.papa.numeroDocumento;
  const papaCel = formState.padresTutores.papa.celularContacto;
  const papaMail = formState.padresTutores.papa.correoElectronico;
  const papaFecNac = formState.padresTutores.papa.fechaNacimiento;
  const papaDir = formState.padresTutores.papa.direccionDomicilio;
  const papaGrado = formState.padresTutores.papa.gradoInstruccion;
  const papaProf = formState.padresTutores.papa.profesionOcupacion;
  const papaCent = formState.padresTutores.papa.centroTrabajo;
  const papaCargo = formState.padresTutores.papa.cargo;
  const papaIngr = formState.padresTutores.papa.ingresosMensuales;
  const papaHor = formState.padresTutores.papa.horarioLaboral;

  const mamaNombres = formState.padresTutores.mama.nombres;
  const mamaApePat = formState.padresTutores.mama.apellidoPaterno;
  const mamaApeMat = formState.padresTutores.mama.apellidoMaterno;
  const mamaTipoDoc = formState.padresTutores.mama.tipoDocumento;
  const mamaNumDoc = formState.padresTutores.mama.numeroDocumento;
  const mamaCel = formState.padresTutores.mama.celularContacto;
  const mamaMail = formState.padresTutores.mama.correoElectronico;
  const mamaFecNac = formState.padresTutores.mama.fechaNacimiento;
  const mamaDir = formState.padresTutores.mama.direccionDomicilio;
  const mamaGrado = formState.padresTutores.mama.gradoInstruccion;
  const mamaProf = formState.padresTutores.mama.profesionOcupacion;
  const mamaCent = formState.padresTutores.mama.centroTrabajo;
  const mamaCargo = formState.padresTutores.mama.cargo;
  const mamaIngr = formState.padresTutores.mama.ingresosMensuales;
  const mamaHor = formState.padresTutores.mama.horarioLaboral;

  // Sync apoderado with papa data
  useEffect(() => {
    if (isFormSimple) return;
    if (apoderadoTipo === 'papa') {
      setFormState(prev => ({
        ...prev,
        padresTutores: {
          ...prev.padresTutores,
          apoderado: {
            ...prev.padresTutores.papa,
            fallecido: false
          }
        }
      }));
    }
  }, [
    isFormSimple,
    apoderadoTipo, 
    papaNombres, 
    papaApePat, 
    papaApeMat, 
    papaTipoDoc, 
    papaNumDoc, 
    papaCel, 
    papaMail, 
    papaFecNac, 
    papaDir, 
    papaGrado, 
    papaProf, 
    papaCent, 
    papaCargo, 
    papaIngr, 
    papaHor
  ]);

  // Sync apoderado with mama data
  useEffect(() => {
    if (isFormSimple) return;
    if (apoderadoTipo === 'mama') {
      setFormState(prev => ({
        ...prev,
        padresTutores: {
          ...prev.padresTutores,
          apoderado: {
            ...prev.padresTutores.mama,
            fallecido: false
          }
        }
      }));
    }
  }, [
    isFormSimple,
    apoderadoTipo, 
    mamaNombres, 
    mamaApePat, 
    mamaApeMat, 
    mamaTipoDoc, 
    mamaNumDoc, 
    mamaCel, 
    mamaMail, 
    mamaFecNac, 
    mamaDir, 
    mamaGrado, 
    mamaProf, 
    mamaCent, 
    mamaCargo, 
    mamaIngr, 
    mamaHor
  ]);

  // Load and seed family records on mount
  useEffect(() => {
    const stored = localStorage.getItem('jc_admissions_records');
    const wasSeeded = localStorage.getItem('jc_admissions_records_seeded');
    let loadedRecords = [];
    
    if (stored) {
      try {
        loadedRecords = JSON.parse(stored);
      } catch (e) {
        loadedRecords = [];
      }
    } else if (wasSeeded !== 'true') {
      // First-time load: seed with a rich set of demo records if no key exists
      loadedRecords = getSeededRecords();
      localStorage.setItem('jc_admissions_records', JSON.stringify(loadedRecords));
      localStorage.setItem('jc_admissions_records_seeded', 'true');
    }
    setRecords(loadedRecords);
  }, []);

  // Save/update record helper
  const saveRecord = (newRecord: any) => {
    setRecords(prev => {
      const updated = prev.map(r => r.id === newRecord.id ? newRecord : r);
      if (!updated.some(r => r.id === newRecord.id)) {
        updated.push(newRecord);
      }
      localStorage.setItem('jc_admissions_records', JSON.stringify(updated));
      return updated;
    });
  };

  // Register another child (sibling) with same family and apoderado details
  const handleRegisterSibling = (siblingFormState: FormState) => {
    const cleanStudent = {
      nombres: '',
      apellidoPaterno: siblingFormState.personales.apellidoPaterno || '',
      apellidoMaterno: siblingFormState.personales.apellidoMaterno || '',
      tipoDocumento: 'DNI' as const,
      numeroDocumento: '',
      genero: 'Masculino' as const,
      fechaNacimiento: '',
      colegioProcedencia: '',
      nivelGradoProcedencia: '',
      celularContacto: '',
      tipoColegioProcedencia: 'Colegio Particular' as const
    };

    const cleanPostulacion = {
      ...siblingFormState.postulacion,
      gradoIngreso: '',
      nivelEducativo: '',
      codigoAntiguo: ''
    };

    const nextFormState = {
      ...siblingFormState,
      personales: cleanStudent,
      postulacion: cleanPostulacion
    };

    setFormState(nextFormState);
    setSiblingFamilyCode(siblingFormState.fichaFamilia.codigoFamilia);
    setCurrentUser(null);
    setSubmitted(false);
    setCurrentStep(1);
    setDeclaroVeracidad(false);
    setNewlyRegisteredCredentials(null);
    setActiveView('form');
    triggerToast("🔄 Datos de familia y apoderado conservados. Ingrese los datos del siguiente hijo.");
  };

  // Clean error for a field when its value changes
  const clearFieldError = (fieldKey: string) => {
    if (errors[fieldKey]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
    }
  };

  // Toast helper
  const triggerToast = (message: string) => {
    setShowToast(message);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  // Navigation handlers
  const handleNext = () => {
    const stepErrors = validateStep(currentStep, formState, isFormSimple);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      triggerToast("Por favor, complete todos los campos obligatorios (*) con datos válidos.");
      // Scroll to top of the form or first error
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      setErrors({});
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setErrors({});
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };



  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaroVeracidad) {
      triggerToast("Debe aceptar la Declaración Jurada de Veracidad antes de enviar la ficha.");
      return;
    }
    
    // Final validations check
    const maxSteps = isFormSimple ? 3 : 4;
    for (let i = 1; i <= maxSteps; i++) {
      const stepErrors = validateStep(i, formState, isFormSimple);
      if (Object.keys(stepErrors).length > 0) {
        setCurrentStep(i);
        setErrors(stepErrors);
        triggerToast(`Por favor corrija los errores en el Paso ${i} antes de enviar.`);
        window.scrollTo({ top: 120, behavior: 'smooth' });
        return;
      }
    }

    // Generate unique credentials and save record
    const famCode = siblingFamilyCode || generateNextFamilyCode(records);
    const respVal = isFormSimple ? 'Apoderado' : formState.lugarAdicionales.responsableMatricula;
    let respDni = '';
    if (isFormSimple) {
      respDni = formState.padresTutores.apoderado.numeroDocumento;
    } else {
      if (respVal === 'Padre') {
        respDni = formState.padresTutores.papa.numeroDocumento;
      } else if (respVal === 'Madre') {
        respDni = formState.padresTutores.mama.numeroDocumento;
      } else {
        respDni = formState.padresTutores.apoderado.numeroDocumento;
      }
    }

    const username = famCode;
    const password = respDni || '12345678';
    const studentDni = formState.personales.numeroDocumento || Math.floor(100000 + Math.random() * 900000).toString();
    const recordId = `${famCode}-${studentDni}`;

    // Update state with generated family code if empty
    const finalFormState = {
      ...formState,
      lugarAdicionales: {
        ...formState.lugarAdicionales,
        responsableMatricula: (isFormSimple ? 'Apoderado' : formState.lugarAdicionales.responsableMatricula) as any
      },
      fichaFamilia: {
        ...formState.fichaFamilia,
        codigoFamilia: famCode as any,
        nombreFamilia: formState.fichaFamilia.nombreFamilia || `Familia ${formState.personales.apellidoPaterno} ${formState.personales.apellidoMaterno}`
      }
    };

    const newRecord = {
      id: recordId,
      username,
      password,
      formState: finalFormState,
      documents: {
        dniPostulante: null,
        dniApoderado: null,
        libretaEstudios: null,
        constanciaNoAdeudo: null
      },
      appointment: null,
      status: 'documents_pending',
      assignedClassroom: null,
      createdAt: new Date().toISOString()
    };

    saveRecord(newRecord);
    setNewlyRegisteredCredentials({ username, password });
    setSiblingFamilyCode(null);
    
    // Let them auto-login later or immediately
    setFormState(finalFormState);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step names & icons mapping
  const steps = isFormSimple ? [
    { number: 1, title: 'Postulación', icon: School },
    { number: 2, title: 'Apoderado / Contacto', icon: Heart },
    { number: 3, title: 'Postulante', icon: User },
    { number: 4, title: 'Enviar Pre-Ficha', icon: FileCheck },
  ] : [
    { number: 1, title: 'Postulación', icon: School },
    { number: 2, title: 'Datos Personales', icon: User },
    { number: 3, title: 'Lugar & Adicionales', icon: MapPin },
    { number: 4, title: 'Padres / Tutores', icon: Heart },
    { number: 5, title: 'Enviar Ficha', icon: FileCheck },
  ];

  // Resolve responsible details based on selection in Step 3
  const getResponsableDetails = () => {
    const respType = formState.lugarAdicionales.responsableMatricula;
    if (respType === 'Padre') {
      return {
        tipo: 'Papá',
        data: formState.padresTutores.papa,
        valido: !formState.padresTutores.papa.fallecido && formState.padresTutores.papa.nombres.trim() !== ''
      };
    } else if (respType === 'Madre') {
      return {
        tipo: 'Mamá',
        data: formState.padresTutores.mama,
        valido: !formState.padresTutores.mama.fallecido && formState.padresTutores.mama.nombres.trim() !== ''
      };
    } else {
      return {
        tipo: 'Apoderado Principal',
        data: formState.padresTutores.apoderado,
        valido: formState.padresTutores.apoderado.nombres.trim() !== ''
      };
    }
  };

  const respDetails = getResponsableDetails();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-brand-navy selection:text-white flex flex-col">
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 max-w-md border border-slate-700/50"
          >
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium">{showToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="h-16 bg-brand-navy text-white flex items-center justify-between px-6 sm:px-8 shrink-0 shadow-md relative z-20 no-print">
        <div className="flex items-center gap-3">
          <ShieldLogo className="w-10 h-10 shrink-0 shadow-sm" />
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight uppercase tracking-tight">Juventud Científica</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-semibold">
              {activeView === 'dashboard' ? 'Portal de Seguimiento' : 'Admisión Escolar 2027'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">


          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end pl-3 border-l border-white/20">
                <span className="text-xs font-bold text-amber-400">{currentUser.id}</span>
                <span className="text-[10px] opacity-80 uppercase tracking-wider">
                  {currentUser.role === 'admin' 
                    ? 'SISTEMA ADMINISTRATIVO' 
                    : `${currentUser.formState.personales?.apellidoPaterno || ''} ${currentUser.formState.personales?.apellidoMaterno || ''}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  setActiveView('form');
                  setSubmitted(false);
                  setCurrentStep(1);
                  setFormState(initialFormState);
                  setSiblingFamilyCode(null);
                  setDeclaroVeracidad(false);
                  triggerToast("Sesión cerrada. Formulario reiniciado.");
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg transition duration-150 shadow-md flex items-center space-x-1.5 text-xs hover:scale-102 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-end border-l border-white/20 pl-4">
              <span className="text-xs font-semibold">
                {activeView === 'login' ? 'Portal de Acceso' : 'Formulario de Registro'}
              </span>
              <span className="text-[10px] opacity-70 italic uppercase">Lima, Perú</span>
            </div>
          )}
        </div>
      </header>

      {/* View Switcher Tabs (Only visible when not logged in and not submitted) */}
      {!submitted && activeView !== 'dashboard' && (
        <div className="bg-slate-100 border-b p-1.5 flex justify-center sticky top-0 z-20 no-print">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex gap-2 w-full max-w-md">
            <button
              type="button"
              onClick={() => {
                setActiveView('form');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeView === 'form'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-brand-blue hover:bg-slate-50'
              }`}
            >
              <School className="w-4 h-4" />
              Nuevo Registro
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('login');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeView === 'login'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-brand-blue hover:bg-slate-50'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Step Progress Indicator */}
      {!submitted && activeView === 'form' && (
        <nav className="bg-white border-b flex items-center justify-center px-4 sm:px-10 py-5 shrink-0 shadow-xs relative z-10">
          <div className="flex w-full max-w-4xl justify-between items-center relative">
            {/* Background progress bar line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10"></div>
            
            {/* Active/Completed progress fill */}
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-brand-navy -translate-y-1/2 transition-all duration-500 -z-10 shadow-sm"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {/* Step Nodes */}
            {steps.map((s) => {
              const isCompleted = s.number < currentStep;
              const isActive = s.number === currentStep;
              
              return (
                <button
                  key={s.number}
                  type="button"
                  disabled={s.number > currentStep && !Object.keys(validateStep(currentStep, formState, isFormSimple)).length}
                  onClick={() => {
                    const stepErrors = validateStep(currentStep, formState, isFormSimple);
                    if (s.number > currentStep && Object.keys(stepErrors).length > 0) {
                      setErrors(stepErrors);
                      triggerToast("Por favor, complete los campos obligatorios (*) antes de continuar.");
                    } else {
                      setErrors({});
                      setCurrentStep(s.number);
                    }
                  }}
                  className="flex flex-col items-center focus:outline-none group relative transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition">
                      ✓
                    </div>
                  ) : isActive ? (
                    <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-brand-blue/30 transition duration-300">
                      {s.number}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-slate-400 flex items-center justify-center text-sm font-bold hover:border-slate-300 transition bg-white">
                      {s.number}
                    </div>
                  )}
                  <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider hidden md:block ${
                    isCompleted ? 'text-brand-green' : isActive ? 'text-brand-navy' : 'text-slate-400'
                  }`}>
                    {s.title}
                  </span>
                  
                  {/* Tooltip on hover for smaller screens */}
                  <span className="md:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-semibold px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20">
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col items-center bg-slate-50 relative z-0">

        {activeView === 'dashboard' && currentUser ? (
          currentUser.role === 'admin' ? (
            <AdminDashboardView 
              currentUser={currentUser}
              records={records}
              onSaveRecord={(record) => {
                const index = records.findIndex(r => r.id === record.id);
                if (index !== -1) {
                  const updated = [...records];
                  updated[index] = record;
                  setRecords(updated);
                  localStorage.setItem('jc_admissions_records', JSON.stringify(updated));
                } else {
                  const updated = [...records, record];
                  setRecords(updated);
                  localStorage.setItem('jc_admissions_records', JSON.stringify(updated));
                }
              }}
              onLogout={() => {
                setCurrentUser(null);
                setActiveView('form');
                setSubmitted(false);
                setCurrentStep(1);
                setFormState(initialFormState);
                setSiblingFamilyCode(null);
                triggerToast("Sesión de administrador cerrada.");
              }}
              triggerToast={triggerToast}
              dynamicDistritos={districtsList}
              setDynamicDistritos={setDistrictsList}
              dynamicSedesMap={sedesMap}
              setDynamicSedesMap={setSedesMap}
              dynamicGrados={gradosList}
              setDynamicGrados={setGradosList}
              sedeLevels={sedeLevels}
              setSedeLevels={setSedeLevels}
              sedeAddresses={sedeAddresses}
              setSedeAddresses={setSedeAddresses}
              admissionFee={admissionFee}
              setAdmissionFee={setAdmissionFee}
              admissionFeeActive={admissionFeeActive}
              setAdmissionFeeActive={setAdmissionFeeActive}
              onDeleteRecord={(id) => {
                const updated = records.filter(r => r.id !== id);
                setRecords(updated);
                localStorage.setItem('jc_admissions_records', JSON.stringify(updated));
              }}
              onClearRecords={() => {
                setRecords([]);
                localStorage.setItem('jc_admissions_records', JSON.stringify([]));
              }}
              onRestoreDemoRecords={() => {
                const demoRecords = getSeededRecords();
                setRecords(demoRecords);
                localStorage.setItem('jc_admissions_records', JSON.stringify(demoRecords));
                localStorage.setItem('jc_admissions_records_seeded', 'true');
              }}
            />
          ) : (
            <DashboardView 
              currentUser={currentUser} 
              records={records} 
              saveRecord={saveRecord} 
              setCurrentUser={setCurrentUser} 
              triggerToast={triggerToast} 
              onRegisterSibling={handleRegisterSibling}
              admissionFee={admissionFee}
            />
          )
        ) : activeView === 'login' ? (
          <LoginView 
            records={records} 
            onLoginSuccess={(record) => {
              setCurrentUser(record);
              setActiveView('dashboard');
            }} 
            onSwitchToRegister={() => {
              setActiveView('form');
              setCurrentStep(1);
            }} 
            triggerToast={triggerToast} 
          />
        ) : !submitted ? (
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col no-print">
            {/* Header of Active step */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200/60 flex justify-between items-center shrink-0">
              <div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase block mb-0.5">Paso {currentStep} de {steps.length}</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 uppercase tracking-tight">
                  {currentStep === 1 && "1. Tipo de Alumno & Postulación 2027"}
                  {currentStep === 2 && (isFormSimple ? "2. Datos del Apoderado de Contacto" : "2. Datos Personales del Postulante")}
                  {currentStep === 3 && (isFormSimple ? "3. Datos Personales del Postulante" : "3. Lugar y Adicionales de Nacimiento/Salud")}
                  {currentStep === 4 && (isFormSimple ? "4. Resumen y Envío de Pre-Ficha" : "4. Información de Padres y Tutores")}
                  {currentStep === 5 && !isFormSimple && "5. Resumen y Envío de Ficha"}
                </h2>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold shadow-sm whitespace-nowrap">
                Paso {currentStep} de {steps.length}
              </span>
            </div>

            {/* Form fields panel with animated transition */}
            <div className="p-6 sm:p-8 flex-1">
              {/* PASO 1: POSTULACION */}
              {currentStep === 1 && (
                <div className="space-y-6">
                      {/* TIPO DE ALUMNO POSTULANTE */}
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-150">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">1. TIPO DE ALUMNO POSTULANTE</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className={`flex items-center space-x-3 p-3.5 rounded-lg border-2 cursor-pointer transition ${
                            formState.postulacion.tipoAlumno === 'nuevo' 
                              ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold shadow-sm' 
                              : 'border-slate-200 hover:bg-slate-50 bg-white'
                          }`}>
                            <input 
                              type="radio" 
                              name="tipoAlumno" 
                              value="nuevo"
                              checked={formState.postulacion.tipoAlumno === 'nuevo'}
                              onChange={() => {
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: { ...prev.postulacion, tipoAlumno: 'nuevo', codigoAntiguo: '' }
                                }));
                              }}
                              className="w-4.5 h-4.5 text-blue-600 border-slate-300 focus:ring-blue-500" 
                            />
                            <div>
                              <span className="block text-sm">Alumno Nuevo / Externo</span>
                              <span className="block text-xs font-normal text-slate-400">Postulante por primera vez al colegio</span>
                            </div>
                          </label>

                          <label className={`flex items-center space-x-3 p-3.5 rounded-lg border-2 cursor-pointer transition ${
                            formState.postulacion.tipoAlumno === 'antiguo' 
                              ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold shadow-sm' 
                              : 'border-slate-200 hover:bg-slate-50 bg-white'
                          }`}>
                            <input 
                              type="radio" 
                              name="tipoAlumno" 
                              value="antiguo"
                              checked={formState.postulacion.tipoAlumno === 'antiguo'}
                              onChange={() => {
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: { ...prev.postulacion, tipoAlumno: 'antiguo' }
                                }));
                              }}
                              className="w-4.5 h-4.5 text-blue-600 border-slate-300 focus:ring-blue-500" 
                            />
                            <div>
                              <span className="block text-sm">Alumno Antiguo / Ratificación</span>
                              <span className="block text-xs font-normal text-slate-400">Estudiante que ya cursa estudios con nosotros</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* DATOS DE POSTULACION 2027 */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">2. DATOS DE POSTULACIÓN 2027</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Año Proceso (fijo solo lectura) */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Año del Proceso de Admisión</label>
                            <input 
                              type="text" 
                              value={formState.postulacion.anoProceso} 
                              disabled 
                              className="w-full rounded-lg border-slate-300 bg-slate-100 text-slate-500 text-sm p-2.5 cursor-not-allowed border"
                            />
                          </div>

                          {/* Distrito de Postulacion */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Distrito de Postulación <span className="text-red-500">*</span></label>
                            <select
                              value={formState.postulacion.distritoPostulacion}
                              onChange={(e) => {
                                const newDist = e.target.value;
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: {
                                    ...prev.postulacion,
                                    distritoPostulacion: newDist,
                                    nivelEducativo: '',
                                    gradoIngreso: '',
                                    sedeLocal: ''
                                  }
                                }));
                                clearFieldError('distritoPostulacion');
                                clearFieldError('nivelEducativo');
                                clearFieldError('gradoIngreso');
                                clearFieldError('sedeLocal');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.distritoPostulacion ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            >
                              <option value="">-- Seleccione un Distrito --</option>
                              {districtsList.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                            {errors.distritoPostulacion && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.distritoPostulacion}
                              </p>
                            )}
                          </div>

                          {/* Nivel Educativo */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nivel Educativo <span className="text-red-500">*</span></label>
                            <select
                              value={formState.postulacion.nivelEducativo}
                              disabled={!formState.postulacion.distritoPostulacion}
                              onChange={(e) => {
                                const newNivel = e.target.value;
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: { 
                                    ...prev.postulacion, 
                                    nivelEducativo: newNivel,
                                    gradoIngreso: '',
                                    sedeLocal: ''
                                  }
                                }));
                                clearFieldError('nivelEducativo');
                                clearFieldError('gradoIngreso');
                                clearFieldError('sedeLocal');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                errors.nivelEducativo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            >
                              {!formState.postulacion.distritoPostulacion ? (
                                <option value="">Seleccione un distrito primero</option>
                              ) : (
                                <>
                                  <option value="">-- Seleccione Nivel --</option>
                                  {NIVELES_EDUCATIVOS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </>
                              )}
                            </select>
                            {errors.nivelEducativo && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.nivelEducativo}
                              </p>
                            )}
                          </div>

                          {/* Grado a Postular */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Grado a Postular <span className="text-red-500">*</span></label>
                            <select
                              value={formState.postulacion.gradoIngreso}
                              disabled={!formState.postulacion.nivelEducativo}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: { 
                                    ...prev.postulacion, 
                                    gradoIngreso: e.target.value,
                                    sedeLocal: ''
                                  }
                                }));
                                clearFieldError('gradoIngreso');
                                clearFieldError('sedeLocal');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                errors.gradoIngreso ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            >
                              {!formState.postulacion.nivelEducativo ? (
                                <option value="">Seleccione un nivel primero</option>
                              ) : (
                                <>
                                  <option value="">-- Seleccione Grado --</option>
                                  {gradosList.filter(g => g.nivel === formState.postulacion.nivelEducativo).map(g => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                  ))}
                                </>
                              )}
                            </select>
                            {errors.gradoIngreso && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.gradoIngreso}
                              </p>
                            )}
                          </div>

                          {/* Sede / Local escolar (select dinamico, ordenado al final) */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sede / Local Escolar <span className="text-red-500">*</span></label>
                            <select
                              value={formState.postulacion.sedeLocal}
                              disabled={!formState.postulacion.gradoIngreso}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  postulacion: { 
                                    ...prev.postulacion, 
                                    sedeLocal: e.target.value
                                  }
                                }));
                                clearFieldError('sedeLocal');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                errors.sedeLocal ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            >
                              {!formState.postulacion.gradoIngreso ? (
                                <option value="">Seleccione el grado a postular primero</option>
                              ) : (
                                <>
                                  <option value="">-- Seleccione la Sede --</option>
                                  {(sedesMap[formState.postulacion.distritoPostulacion] || [])
                                    .filter(sede => (sedeLevels[sede] || []).includes(formState.postulacion.nivelEducativo))
                                    .map(sede => (
                                      <option key={sede} value={sede}>{sede}</option>
                                    ))
                                  }
                                </>
                              )}
                            </select>
                            {errors.sedeLocal && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.sedeLocal}
                              </p>
                            )}

                            {/* Mostrar Dirección / Ubicación de la Sede Seleccionada */}
                            {formState.postulacion.sedeLocal && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-150 flex items-start gap-3"
                              >
                                <span className="text-lg text-blue-600 shrink-0 mt-0.5">📍</span>
                                <div>
                                  <span className="block text-[10px] font-black text-blue-500 uppercase tracking-wider">Dirección de la Sede</span>
                                  <span className="block text-xs font-bold text-slate-800 mt-0.5">
                                    {sedeAddresses[formState.postulacion.sedeLocal] || 'Dirección no registrada'}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* STATIC VACANCY CONFIRMATION BOX */}
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl text-blue-900 text-sm flex items-start space-x-3 shadow-xs">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Disponibilidad de Vacante Confirmada:</strong>
                          <span>Hay vacantes disponibles para este grado y sede. Su lugar quedará temporalmente pre-reservado al enviar esta solicitud.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3 (Ficha Simplificada) o PASO 2 (Ficha Completa): DATOS PERSONALES DEL POSTULANTE */}
                  {((isFormSimple && currentStep === 3) || (!isFormSimple && currentStep === 2)) && (
                    isFormSimple ? (
                      <div className="space-y-4">
                        {/* HEADER */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                          <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
                            <User className="w-5 h-5 text-blue-700" />
                            Datos Personales del Postulante
                          </h4>
                          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                            Ingrese los datos del alumno postulante. Al escribir un DNI registrado, el sistema completará sus datos automáticamente. De lo contrario, rellene los campos manualmente.
                          </p>
                        </div>

                        {/* SECCIÓN 1: INFORMACIÓN PERSONAL */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            1. Información Personal
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Tipo Documento */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Documento <span className="text-red-500">*</span></label>
                              <select
                                value={formState.personales.tipoDocumento}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, tipoDocumento: e.target.value }
                                  }));
                                  clearFieldError('tipoDocumento');
                                }}
                                className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              >
                                <option value="DNI">DNI</option>
                                <option value="Carnet de Extranjería">Carnet de Extranjería</option>
                                <option value="Pasaporte">Pasaporte</option>
                              </select>
                            </div>

                            {/* Numero Documento */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Documento <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                maxLength={12}
                                value={formState.personales.numeroDocumento}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormState(prev => {
                                    const updated = {
                                      ...prev,
                                      personales: { ...prev.personales, numeroDocumento: val }
                                    };

                                    if (val.length >= 8) {
                                      const match = records.find(r => 
                                        r.formState?.personales?.numeroDocumento === val
                                      );

                                      if (match) {
                                        const p = match.formState.personales;
                                        updated.personales = {
                                          ...updated.personales,
                                          nombres: p.nombres || '',
                                          apellidoPaterno: p.apellidoPaterno || '',
                                          apellidoMaterno: p.apellidoMaterno || '',
                                          genero: p.genero || 'Masculino',
                                          fechaNacimiento: p.fechaNacimiento || '',
                                          celularContacto: p.celularContacto || '',
                                          tipoColegioProcedencia: p.tipoColegioProcedencia || 'Colegio Particular',
                                          colegioProcedencia: p.colegioProcedencia || '',
                                          nivelGradoProcedencia: p.nivelGradoProcedencia || ''
                                        };
                                        setTimeout(() => {
                                          clearFieldError('nombres');
                                          clearFieldError('apellidoPaterno');
                                          clearFieldError('apellidoMaterno');
                                          clearFieldError('fechaNacimiento');
                                        }, 0);
                                      }
                                    }
                                    return updated;
                                  });
                                  clearFieldError('numeroDocumento');
                                }}
                                placeholder="Ej. 45678912"
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {formState.personales.numeroDocumento.length >= 8 && records.some(r => 
                                r.formState?.personales?.numeroDocumento === formState.personales.numeroDocumento
                              ) && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-semibold">
                                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                  ✔ Registrado. ¡Autocompletado!
                                </p>
                              )}
                              {errors.numeroDocumento && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.numeroDocumento}
                                </p>
                              )}
                            </div>

                            {/* Genero */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Género <span className="text-red-500">*</span></label>
                              <select
                                value={formState.personales.genero}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, genero: e.target.value }
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                              </select>
                            </div>

                            {/* Nombres Completos */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombres Completos <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                value={formState.personales.nombres}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, nombres: e.target.value }
                                  }));
                                  clearFieldError('nombres');
                                }}
                                placeholder="Nombres completos"
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.nombres ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {errors.nombres && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.nombres}
                                </p>
                              )}
                            </div>

                            {/* Apellido Paterno */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                value={formState.personales.apellidoPaterno}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, apellidoPaterno: e.target.value }
                                  }));
                                  clearFieldError('apellidoPaterno');
                                }}
                                placeholder="Apellido paterno"
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.apellidoPaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {errors.apellidoPaterno && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.apellidoPaterno}
                                </p>
                              )}
                            </div>

                            {/* Apellido Materno */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                value={formState.personales.apellidoMaterno}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, apellidoMaterno: e.target.value }
                                  }));
                                  clearFieldError('apellidoMaterno');
                                }}
                                placeholder="Apellido materno"
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.apellidoMaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {errors.apellidoMaterno && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.apellidoMaterno}
                                </p>
                              )}
                            </div>

                            {/* Fecha de Nacimiento */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                              <input 
                                type="date"
                                value={formState.personales.fechaNacimiento}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, fechaNacimiento: e.target.value }
                                  }));
                                  clearFieldError('fechaNacimiento');
                                }}
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.fechaNacimiento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {errors.fechaNacimiento && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.fechaNacimiento}
                                </p>
                              )}
                            </div>

                            {/* Tipo de Colegio de Procedencia */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Colegio <span className="text-slate-400 font-normal">(Opcional)</span></label>
                              <select
                                value={formState.personales.tipoColegioProcedencia || 'Colegio Particular'}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, tipoColegioProcedencia: e.target.value }
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              >
                                <option value="Colegio Particular">Colegio Particular</option>
                                <option value="Colegio Estatal">Colegio Estatal</option>
                              </select>
                            </div>

                            {/* Colegio de Procedencia */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Colegio de Procedencia <span className="text-slate-400 font-normal">(Opcional)</span></label>
                              <input 
                                type="text"
                                value={formState.personales.colegioProcedencia}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, colegioProcedencia: e.target.value }
                                  }));
                                }}
                                placeholder="Nombre del colegio anterior"
                                className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            </div>

                            {/* Distrito de Colegio de Procedencia */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Distrito Colegio Procedencia <span className="text-slate-400 font-normal">(Opcional)</span></label>
                              <input 
                                type="text"
                                value={formState.personales.nivelGradoProcedencia}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    personales: { ...prev.personales, nivelGradoProcedencia: e.target.value }
                                  }));
                                }}
                                placeholder="Ej. El Agustino"
                                className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECCIÓN 2: SEGURO DE ACCIDENTES */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            2. Seguro de Accidentes
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            {/* ¿Cuenta con Seguro de Accidentes? */}
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-150">
                              <span className="block text-sm font-semibold text-slate-700 mb-1">¿Cuenta con Seguro de Accidentes? <span className="text-red-500">*</span></span>
                              <div className="flex items-center space-x-6 py-1">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="cuentaSeguro" 
                                    value="Si"
                                    checked={formState.lugarAdicionales.cuentaSeguro === 'Si'}
                                    onChange={() => {
                                      setFormState(prev => ({
                                        ...prev,
                                        lugarAdicionales: { ...prev.lugarAdicionales, cuentaSeguro: 'Si' }
                                      }));
                                      clearFieldError('cuentaSeguro');
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-slate-700">Sí</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="cuentaSeguro" 
                                    value="No"
                                    checked={formState.lugarAdicionales.cuentaSeguro === 'No'}
                                    onChange={() => {
                                      setFormState(prev => ({
                                        ...prev,
                                        lugarAdicionales: { ...prev.lugarAdicionales, cuentaSeguro: 'No', aseguradora: '' }
                                      }));
                                      clearFieldError('cuentaSeguro');
                                      clearFieldError('aseguradora');
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-slate-700">No</span>
                                </label>
                              </div>
                              {errors.cuentaSeguro && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.cuentaSeguro}
                                </p>
                              )}
                            </div>

                            {/* Aseguradora - Solo visible si cuentaSeguro === 'Si' */}
                            {formState.lugarAdicionales.cuentaSeguro === 'Si' ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-slate-50 rounded-lg border border-slate-150 h-full flex flex-col justify-center"
                              >
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Compañía Aseguradora <span className="text-red-500">*</span></label>
                                <input 
                                  type="text"
                                  value={formState.lugarAdicionales.aseguradora}
                                  onChange={(e) => {
                                    setFormState(prev => ({
                                      ...prev,
                                      lugarAdicionales: { ...prev.lugarAdicionales, aseguradora: e.target.value }
                                    }));
                                    clearFieldError('aseguradora');
                                  }}
                                  placeholder="Rimac, Pacífico, Mapfre, La Positiva, etc."
                                  className={`w-full rounded-lg border shadow-sm text-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                    errors.aseguradora ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                  }`}
                                />
                                {errors.aseguradora && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.aseguradora}
                                  </p>
                                )}
                              </motion.div>
                            ) : null}
                          </div>
                        </div>

                        {/* SECCIÓN 3: DIAGNÓSTICO MÉDICO O PSICOLÓGICO */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            3. Diagnóstico Médico o Psicológico
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            {/* ¿Tiene algún diagnóstico médico o psicológico? */}
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-150">
                              <span className="block text-sm font-semibold text-slate-700 mb-1">¿Tiene algún diagnóstico médico o psicológico? <span className="text-red-500">*</span></span>
                              <div className="flex items-center space-x-6 py-1">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="tieneDiagnostico" 
                                    value="Si"
                                    checked={formState.lugarAdicionales.tieneDiagnostico === 'Si'}
                                    onChange={() => {
                                      setFormState(prev => ({
                                        ...prev,
                                        lugarAdicionales: { ...prev.lugarAdicionales, tieneDiagnostico: 'Si' }
                                      }));
                                      clearFieldError('tieneDiagnostico');
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-slate-700">Sí</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="tieneDiagnostico" 
                                    value="No"
                                    checked={formState.lugarAdicionales.tieneDiagnostico === 'No'}
                                    onChange={() => {
                                      setFormState(prev => ({
                                        ...prev,
                                        lugarAdicionales: { ...prev.lugarAdicionales, tieneDiagnostico: 'No', diagnosticoDetalle: '' }
                                      }));
                                      clearFieldError('tieneDiagnostico');
                                      clearFieldError('diagnosticoDetalle');
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-slate-700">No</span>
                                </label>
                              </div>
                              {errors.tieneDiagnostico && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.tieneDiagnostico}
                                </p>
                              )}
                            </div>

                            {/* Detalle del Diagnóstico - Solo visible si tieneDiagnostico === 'Si' */}
                            {formState.lugarAdicionales.tieneDiagnostico === 'Si' ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-slate-50 rounded-lg border border-slate-150 h-full flex flex-col justify-center"
                              >
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Escriba cuál <span className="text-red-500">*</span></label>
                                <input 
                                  type="text"
                                  value={formState.lugarAdicionales.diagnosticoDetalle || ''}
                                  onChange={(e) => {
                                    setFormState(prev => ({
                                      ...prev,
                                      lugarAdicionales: { ...prev.lugarAdicionales, diagnosticoDetalle: e.target.value }
                                    }));
                                    clearFieldError('diagnosticoDetalle');
                                  }}
                                  placeholder="Escriba el diagnóstico aquí..."
                                  className={`w-full rounded-lg border shadow-sm text-sm p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                    errors.diagnosticoDetalle ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                  }`}
                                />
                                {errors.diagnosticoDetalle && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.diagnosticoDetalle}
                                  </p>
                                )}
                              </motion.div>
                            ) : null}
                          </div>
                        </div>

                        {/* SECCIÓN 4: INFORMACIÓN RELIGIOSA */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            4. Información Religiosa del Menor
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {/* Religión del Menor */}
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Religión del Menor <span className="text-red-500">*</span></label>
                              <select
                                value={formState.lugarAdicionales.religion}
                                onChange={(e) => {
                                  const newRel = e.target.value;
                                  setFormState(prev => ({
                                    ...prev,
                                    lugarAdicionales: { 
                                      ...prev.lugarAdicionales, 
                                      religion: newRel,
                                      asisteIglesia: newRel ? prev.lugarAdicionales.asisteIglesia : '',
                                      iglesiaParroquia: newRel ? prev.lugarAdicionales.iglesiaParroquia : ''
                                    }
                                  }));
                                  clearFieldError('religion');
                                }}
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.religion ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              >
                                <option value="">-- Seleccione una Religión --</option>
                                <option value="Católica">Católica</option>
                                <option value="Cristiana Evangélica">Cristiana Evangélica</option>
                                <option value="Adventista">Adventista</option>
                                <option value="Testigo de Jehová">Testigo de Jehová</option>
                                <option value="Mormona">Mormona</option>
                                <option value="Otra">Otra</option>
                                <option value="Ninguna">Ninguna</option>
                              </select>
                              {errors.religion && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.religion}
                                </p>
                              )}
                            </div>

                            {/* ¿Asiste a alguna iglesia? - Solo visible si religión no es vacía */}
                            {formState.lugarAdicionales.religion !== '' ? (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                <span className="block text-sm font-semibold text-slate-700 mb-1">¿Asiste a alguna iglesia? <span className="text-red-500">*</span></span>
                                <div className="flex items-center space-x-6 py-2">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name="asisteIglesia" 
                                      value="Si"
                                      checked={formState.lugarAdicionales.asisteIglesia === 'Si'}
                                      onChange={() => {
                                        setFormState(prev => ({
                                          ...prev,
                                          lugarAdicionales: { ...prev.lugarAdicionales, asisteIglesia: 'Si' }
                                        }));
                                        clearFieldError('asisteIglesia');
                                      }}
                                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Sí</span>
                                  </label>

                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name="asisteIglesia" 
                                      value="No"
                                      checked={formState.lugarAdicionales.asisteIglesia === 'No'}
                                      onChange={() => {
                                        setFormState(prev => ({
                                          ...prev,
                                          lugarAdicionales: { ...prev.lugarAdicionales, asisteIglesia: 'No', iglesiaParroquia: '' }
                                        }));
                                        clearFieldError('asisteIglesia');
                                        clearFieldError('iglesiaParroquia');
                                      }}
                                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">No</span>
                                  </label>
                                </div>
                                {errors.asisteIglesia && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.asisteIglesia}
                                  </p>
                                )}
                              </motion.div>
                            ) : null}

                            {/* Nombre de la Iglesia - Solo visible si asisteIglesia === 'Si' */}
                            {formState.lugarAdicionales.religion !== '' && formState.lugarAdicionales.asisteIglesia === 'Si' ? (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Iglesia <span className="text-red-500">*</span></label>
                                <input 
                                  type="text"
                                  value={formState.lugarAdicionales.iglesiaParroquia}
                                  onChange={(e) => {
                                    setFormState(prev => ({
                                      ...prev,
                                      lugarAdicionales: { ...prev.lugarAdicionales, iglesiaParroquia: e.target.value }
                                    }));
                                    clearFieldError('iglesiaParroquia');
                                  }}
                                  placeholder="Ej. Parroquia San Juan, etc."
                                  className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                    errors.iglesiaParroquia ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                  }`}
                                />
                                {errors.iglesiaParroquia && (
                                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.iglesiaParroquia}
                                  </p>
                                )}
                              </motion.div>
                            ) : null}
                          </div>

                          {/* SACRAMENTOS */}
                          <div className="border-t border-slate-100 pt-3">
                            <span className="block text-sm font-semibold text-slate-700 mb-2">Sacramentos</span>
                            <div className="flex flex-row items-center gap-6 py-1">
                              {/* Bautizado */}
                              <label className="flex items-center space-x-2.5 cursor-pointer p-1">
                                <input 
                                  type="checkbox"
                                  checked={formState.lugarAdicionales.bautizado}
                                  onChange={(e) => {
                                    setFormState(prev => ({
                                      ...prev,
                                      lugarAdicionales: { ...prev.lugarAdicionales, bautizado: e.target.checked }
                                    }));
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">¿Está Bautizado(a)?</span>
                              </label>

                              {/* Primera Comunión */}
                              <label className="flex items-center space-x-2.5 cursor-pointer p-1">
                                <input 
                                  type="checkbox"
                                  checked={formState.lugarAdicionales.primeraComunion}
                                  onChange={(e) => {
                                    setFormState(prev => ({
                                      ...prev,
                                      lugarAdicionales: { ...prev.lugarAdicionales, primeraComunion: e.target.checked }
                                    }));
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">¿Hizo la Primera Comunión?</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Nombres */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombres <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.personales.nombres}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, nombres: e.target.value }
                                }));
                                clearFieldError('nombres');
                              }}
                              placeholder="Ingrese nombres completos"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.nombres ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.nombres && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.nombres}
                              </p>
                            )}
                          </div>

                          {/* Apellido Paterno */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.personales.apellidoPaterno}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, apellidoPaterno: e.target.value }
                                }));
                                clearFieldError('apellidoPaterno');
                              }}
                              placeholder="Ingrese apellido paterno"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apellidoPaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apellidoPaterno && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apellidoPaterno}
                              </p>
                            )}
                          </div>

                          {/* Apellido Materno */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.personales.apellidoMaterno}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, apellidoMaterno: e.target.value }
                                }));
                                clearFieldError('apellidoMaterno');
                              }}
                              placeholder="Ingrese apellido materno"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apellidoMaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apellidoMaterno && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apellidoMaterno}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Tipo de Documento */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Documento <span className="text-red-500">*</span></label>
                            <select
                              value={formState.personales.tipoDocumento}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, tipoDocumento: e.target.value }
                                }));
                                clearFieldError('tipoDocumento');
                              }}
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              {TIPOS_DOCUMENTO.map(td => (
                                <option key={td} value={td}>{td}</option>
                              ))}
                            </select>
                          </div>

                          {/* Numero de Documento */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Documento <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.personales.numeroDocumento}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, numeroDocumento: e.target.value }
                                }));
                                clearFieldError('numeroDocumento');
                              }}
                              placeholder="Número de DNI, CE o Pasaporte"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.numeroDocumento && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.numeroDocumento}
                              </p>
                            )}
                          </div>

                          {/* Genero */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Género <span className="text-red-500">*</span></label>
                            <select
                              value={formState.personales.genero}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, genero: e.target.value }
                                }));
                              }}
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="Masculino">Masculino</option>
                              <option value="Femenino">Femenino</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Fecha de Nacimiento */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                            <input 
                              type="date"
                              value={formState.personales.fechaNacimiento}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, fechaNacimiento: e.target.value }
                                }));
                                clearFieldError('fechaNacimiento');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.fechaNacimiento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.fechaNacimiento && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.fechaNacimiento}
                              </p>
                            )}
                          </div>

                          {/* Colegio de Procedencia */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Colegio de Procedencia <span className="text-slate-400 font-normal">(Opcional)</span></label>
                            <input 
                              type="text"
                              value={formState.personales.colegioProcedencia}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, colegioProcedencia: e.target.value }
                                }));
                              }}
                              placeholder="Colegio o Jardín anterior"
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          {/* Nivel y Grado de Procedencia */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nivel y Grado de Procedencia <span className="text-slate-400 font-normal">(Opcional)</span></label>
                            <input 
                              type="text"
                              value={formState.personales.nivelGradoProcedencia}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  personales: { ...prev.personales, nivelGradoProcedencia: e.target.value }
                                }));
                              }}
                              placeholder="Ej. Inicial 4 años"
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* PASO 2 (Ficha Simplificada): DATOS DEL APODERADO DE CONTACTO */}
                  {isFormSimple && currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-6">
                          <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
                            <Heart className="w-5 h-5 text-blue-700" />
                            Datos del Apoderado de Contacto
                          </h4>
                          <p className="text-xs text-blue-800 mt-1.5 leading-relaxed">
                            Ingrese los datos del apoderado. Al escribir un DNI registrado, el sistema completará sus datos automáticamente. De lo contrario, rellene los campos manualmente.
                          </p>
                        </div>

                        {/* ROW 1: DOCUMENTO DE IDENTIDAD */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-5">
                          {/* Tipo Documento */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Documento <span className="text-red-500">*</span></label>
                            <select
                              value={formState.padresTutores.apoderado.tipoDocumento}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, tipoDocumento: e.target.value }
                                  }
                                }));
                              }}
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="DNI">DNI</option>
                              <option value="Carnet de Extranjería">Carnet de Extranjería</option>
                              <option value="Pasaporte">Pasaporte</option>
                            </select>
                          </div>

                          {/* Numero Documento */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Documento <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              maxLength={12}
                              value={formState.padresTutores.apoderado.numeroDocumento}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormState(prev => {
                                  const updated = {
                                    ...prev,
                                    padresTutores: {
                                      ...prev.padresTutores,
                                      apoderado: { ...prev.padresTutores.apoderado, numeroDocumento: val }
                                    }
                                  };

                                  if (val.length >= 8) {
                                    const match = records.find(r => 
                                      r.formState?.padresTutores?.apoderado?.numeroDocumento === val ||
                                      r.formState?.padresTutores?.papa?.numeroDocumento === val ||
                                      r.formState?.padresTutores?.mama?.numeroDocumento === val
                                    );

                                    if (match) {
                                      let fam = null;
                                      let rel: 'papa' | 'mama' | 'otro' = 'otro';

                                      if (match.formState?.padresTutores?.apoderado?.numeroDocumento === val) {
                                        fam = match.formState.padresTutores.apoderado;
                                        rel = 'otro';
                                      } else if (match.formState?.padresTutores?.papa?.numeroDocumento === val) {
                                        fam = match.formState.padresTutores.papa;
                                        rel = 'papa';
                                      } else if (match.formState?.padresTutores?.mama?.numeroDocumento === val) {
                                        fam = match.formState.padresTutores.mama;
                                        rel = 'mama';
                                      }

                                      if (fam) {
                                        updated.padresTutores.apoderado = {
                                          ...updated.padresTutores.apoderado,
                                          nombres: fam.nombres || '',
                                          apellidoPaterno: fam.apellidoPaterno || '',
                                          apellidoMaterno: fam.apellidoMaterno || '',
                                          celularContacto: fam.celularContacto || '',
                                          correoElectronico: fam.correoElectronico || ''
                                        };
                                        setTimeout(() => {
                                          setApoderadoTipo(rel);
                                          clearFieldError('apoderado_nombres');
                                          clearFieldError('apoderado_apellidoPaterno');
                                          clearFieldError('apoderado_apellidoMaterno');
                                          clearFieldError('apoderado_celularContacto');
                                          clearFieldError('apoderado_correoElectronico');
                                        }, 0);
                                      }
                                    }
                                  }
                                  return updated;
                                });
                                clearFieldError('apoderado_numeroDocumento');
                              }}
                              placeholder="Ej. 45678912"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {/* Autocomplete notification */}
                            {formState.padresTutores.apoderado.numeroDocumento.length >= 8 && records.some(r => 
                              r.formState?.padresTutores?.apoderado?.numeroDocumento === formState.padresTutores.apoderado.numeroDocumento || 
                              r.formState?.padresTutores?.papa?.numeroDocumento === formState.padresTutores.apoderado.numeroDocumento || 
                              r.formState?.padresTutores?.mama?.numeroDocumento === formState.padresTutores.apoderado.numeroDocumento
                            ) && (
                              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1 font-semibold">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                ✔ Documento registrado. ¡Datos completados automáticamente!
                              </p>
                            )}
                            {errors.apoderado_numeroDocumento && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_numeroDocumento}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ROW 2: NOMBRES Y APELLIDOS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Nombres */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombres Completos <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.padresTutores.apoderado.nombres}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, nombres: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_nombres');
                              }}
                              placeholder="Ej. Juan Carlos"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_nombres ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_nombres && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_nombres}
                              </p>
                            )}
                          </div>

                          {/* Apellido Paterno */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.padresTutores.apoderado.apellidoPaterno}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, apellidoPaterno: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_apellidoPaterno');
                              }}
                              placeholder="Ej. Quispe"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_apellidoPaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_apellidoPaterno && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_apellidoPaterno}
                              </p>
                            )}
                          </div>

                          {/* Apellido Materno */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              value={formState.padresTutores.apoderado.apellidoMaterno}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, apellidoMaterno: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_apellidoMaterno');
                              }}
                              placeholder="Ej. Mendoza"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_apellidoMaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_apellidoMaterno && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_apellidoMaterno}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ROW 3: PARENTESCO, CELULAR Y CORREO */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
                          {/* Parentesco */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Relación / Parentesco <span className="text-red-500">*</span></label>
                            <select
                              value={apoderadoTipo}
                              onChange={(e) => {
                                const val = e.target.value as 'papa' | 'mama' | 'otro';
                                setApoderadoTipo(val);
                              }}
                              className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="papa">Papá (Padre)</option>
                              <option value="mama">Mamá (Madre)</option>
                              <option value="otro">Otro Apoderado / Tutor</option>
                            </select>
                          </div>

                          {/* Celular Contacto */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Celular de Contacto <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              maxLength={9}
                              value={formState.padresTutores.apoderado.celularContacto}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, celularContacto: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_celularContacto');
                              }}
                              placeholder="Ej. 987654321"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_celularContacto ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_celularContacto && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_celularContacto}
                              </p>
                            )}
                          </div>

                          {/* Correo Electronico */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico <span className="text-red-500">*</span></label>
                            <input 
                              type="email"
                              value={formState.padresTutores.apoderado.correoElectronico}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, correoElectronico: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_correoElectronico');
                              }}
                              placeholder="Ej. apoderado@gmail.com"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_correoElectronico ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_correoElectronico && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_correoElectronico}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ROW 4: UBICACIÓN GEOGRÁFICA */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-3 border-t border-slate-100 mt-4">
                          {/* País */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">País <span className="text-red-500">*</span></label>
                            <select
                              value={(formState.padresTutores.apoderado.pais || 'Perú') === 'Perú' ? 'Perú' : 'Otro'}
                              onChange={(e) => {
                                const newPais = e.target.value;
                                setFormState(prev => {
                                  const updatedApoderado = {
                                    ...prev.padresTutores.apoderado,
                                    pais: newPais === 'Perú' ? 'Perú' : 'Otro',
                                    departamento: '',
                                    provincia: '',
                                    distrito: ''
                                  };
                                  return {
                                    ...prev,
                                    padresTutores: {
                                      ...prev.padresTutores,
                                      apoderado: updatedApoderado
                                    }
                                  };
                                });
                                clearFieldError('apoderado_pais');
                                clearFieldError('apoderado_departamento');
                                clearFieldError('apoderado_provincia');
                                clearFieldError('apoderado_distrito');
                              }}
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_pais ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            >
                              <option value="Perú">Perú</option>
                              <option value="Otro">Otro</option>
                            </select>
                            {errors.apoderado_pais && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_pais}
                              </p>
                            )}
                          </div>

                          {/* Escriba el País (only shown if "Otro" is selected in country dropdown) */}
                          {(formState.padresTutores.apoderado.pais !== 'Perú') && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Escriba el País <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={formState.padresTutores.apoderado.pais === 'Otro' ? '' : (formState.padresTutores.apoderado.pais || '')}
                                onChange={(e) => {
                                  setFormState(prev => ({
                                    ...prev,
                                    padresTutores: {
                                      ...prev.padresTutores,
                                      apoderado: { ...prev.padresTutores.apoderado, pais: e.target.value }
                                    }
                                  }));
                                  clearFieldError('apoderado_pais');
                                }}
                                placeholder="Ej. Chile"
                                className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                  errors.apoderado_pais ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                }`}
                              />
                              {errors.apoderado_pais && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {errors.apoderado_pais}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Departamento */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departamento <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={formState.padresTutores.apoderado.departamento || ''}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, departamento: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_departamento');
                              }}
                              placeholder="Ej. Lima"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_departamento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_departamento && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_departamento}
                              </p>
                            )}
                          </div>

                          {/* Provincia */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provincia <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={formState.padresTutores.apoderado.provincia || ''}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, provincia: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_provincia');
                              }}
                              placeholder="Ej. Lima"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_provincia ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_provincia && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_provincia}
                              </p>
                            )}
                          </div>

                          {/* Distrito */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Distrito <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={formState.padresTutores.apoderado.distrito || ''}
                              onChange={(e) => {
                                setFormState(prev => ({
                                  ...prev,
                                  padresTutores: {
                                    ...prev.padresTutores,
                                    apoderado: { ...prev.padresTutores.apoderado, distrito: e.target.value }
                                  }
                                }));
                                clearFieldError('apoderado_distrito');
                              }}
                              placeholder="Ej. El Agustino"
                              className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                errors.apoderado_distrito ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                            {errors.apoderado_distrito && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.apoderado_distrito}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* PASO 3 (Ficha Completa): LUGAR & ADICIONALES */}
                  {!isFormSimple && currentStep === 3 && (
                      <div className="space-y-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">1. UBICACIÓN Y LUGAR DE NACIMIENTO</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        {/* Pais de Nacimiento */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">País de Nacimiento</label>
                          <select
                            value={formState.lugarAdicionales.paisNacimiento}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, paisNacimiento: e.target.value }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Perú">Perú</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>

                        {/* Departamento */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departamento</label>
                          <select
                            value={formState.lugarAdicionales.departamento}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, departamento: e.target.value }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            {DEPARTAMENTOS.map(dep => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </div>

                        {/* Provincia */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provincia</label>
                          <select
                            value={formState.lugarAdicionales.provincia}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, provincia: e.target.value }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            {PROVINCIAS.map(prov => (
                              <option key={prov} value={prov}>{prov}</option>
                            ))}
                          </select>
                        </div>

                        {/* Distrito */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Distrito de Nacimiento</label>
                          <select
                            value={formState.lugarAdicionales.distrito}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, distrito: e.target.value }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            {DISTRITOS_DOMICILIO.map(dst => (
                              <option key={dst} value={dst}>{dst}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Lugar de Nacimiento (Clinica, Hospital, Domicilio) */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lugar de Nacimiento <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={formState.lugarAdicionales.lugarNacimiento}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, lugarNacimiento: e.target.value }
                              }));
                              clearFieldError('lugarNacimiento');
                            }}
                            placeholder="Ej. Clínica San Gabriel / Hospital Rebagliati / Domicilio"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                              errors.lugarNacimiento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {errors.lugarNacimiento && (
                            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.lugarNacimiento}
                            </p>
                          )}
                        </div>

                        {/* Vive Con */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">El Menor Vive con</label>
                          <select
                            value={formState.lugarAdicionales.viveCon}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, viveCon: e.target.value }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Padres">Padres</option>
                            <option value="Madre">Madre</option>
                            <option value="Padre">Padre</option>
                            <option value="Otros">Otros</option>
                          </select>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 pt-4 border-t border-slate-100">2. RESPONSABLE Y SEGURO DE ACCIDENTES</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Responsable de Matrícula */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsable Legal de Matrícula <span className="text-red-500">*</span></label>
                          <select
                            value={formState.lugarAdicionales.responsableMatricula}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { 
                                  ...prev.lugarAdicionales, 
                                  responsableMatricula: e.target.value as 'Padre' | 'Madre' | 'Apoderado' 
                                }
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Padre">Padre (Papá)</option>
                            <option value="Madre">Madre (Mamá)</option>
                            <option value="Apoderado">Apoderado Principal / Tutor Externo</option>
                          </select>
                        </div>

                        {/* Seguro de Accidentes (radio) */}
                        <div>
                          <span className="block text-sm font-semibold text-slate-700 mb-1.5">¿Cuenta con Seguro de Accidentes?</span>
                          <div className="flex items-center space-x-6 py-2.5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="cuentaSeguro" 
                                value="Si"
                                checked={formState.lugarAdicionales.cuentaSeguro === 'Si'}
                                onChange={() => {
                                  setFormState(prev => ({
                                    ...prev,
                                    lugarAdicionales: { ...prev.lugarAdicionales, cuentaSeguro: 'Si' }
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                              />
                              <span className="text-sm">Sí, cuenta con seguro</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="cuentaSeguro" 
                                value="No"
                                checked={formState.lugarAdicionales.cuentaSeguro === 'No'}
                                onChange={() => {
                                  setFormState(prev => ({
                                    ...prev,
                                    lugarAdicionales: { ...prev.lugarAdicionales, cuentaSeguro: 'No', aseguradora: '' }
                                  }));
                                  clearFieldError('aseguradora');
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                              />
                              <span className="text-sm">No cuenta con seguro</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Aseguradora - Solo visible si Sí cuenta con seguro */}
                      {formState.lugarAdicionales.cuentaSeguro === 'Si' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-slate-50/80 rounded-xl border border-slate-150"
                        >
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Compañía Aseguradora <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={formState.lugarAdicionales.aseguradora}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, aseguradora: e.target.value }
                              }));
                              clearFieldError('aseguradora');
                            }}
                            placeholder="Ej. Pacífico, Rímac, Essalud, SIS, etc."
                            className={`w-full sm:max-w-md rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                              errors.aseguradora ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {errors.aseguradora && (
                            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.aseguradora}
                            </p>
                          )}
                        </motion.div>
                      )}

                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 pt-4 border-t border-slate-100">3. INFORMACIÓN RELIGIOSA DEL MENOR</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Religion */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Religión del Menor <span className="text-slate-400 font-normal">(Opcional)</span></label>
                          <input 
                            type="text"
                            value={formState.lugarAdicionales.religion}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, religion: e.target.value }
                              }));
                            }}
                            placeholder="Ej. Católica, Evangélica, etc."
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>

                        {/* Iglesia o Parroquia */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Iglesia / Parroquia <span className="text-slate-400 font-normal">(Opcional)</span></label>
                          <input 
                            type="text"
                            value={formState.lugarAdicionales.iglesiaParroquia}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, iglesiaParroquia: e.target.value }
                              }));
                            }}
                            placeholder="Ej. Parroquia San Carlos"
                            className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 py-2">
                        {/* Bautizado */}
                        <label className="flex items-center space-x-2.5 cursor-pointer p-1">
                          <input 
                            type="checkbox"
                            checked={formState.lugarAdicionales.bautizado}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, bautizado: e.target.checked }
                              }));
                            }}
                            className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">El postulante está Bautizado(a)</span>
                        </label>

                        {/* Primera Comunion */}
                        <label className="flex items-center space-x-2.5 cursor-pointer p-1">
                          <input 
                            type="checkbox"
                            checked={formState.lugarAdicionales.primeraComunion}
                            onChange={(e) => {
                              setFormState(prev => ({
                                ...prev,
                                lugarAdicionales: { ...prev.lugarAdicionales, primeraComunion: e.target.checked }
                              }));
                            }}
                            className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">El postulante hizo la Primera Comunión</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* PASO 4: PADRES / TUTORES (Ficha Completa) o RESUMEN (Ficha Simplificada) */}
                  {currentStep === 4 && (
                    isFormSimple ? (
                      <div className="space-y-6">
                        <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-sm flex items-start space-x-3">
                          <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>Resumen de Inscripción Rápida 2027:</strong> Por favor, verifique que los datos básicos ingresados sean correctos. Luego de la aprobación del Administrador, podrá completar el resto de la información.
                          </div>
                        </div>

                        {/* RESUMEN SIMPLIFICADO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Datos del Postulante */}
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-3">
                            <span className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2 border-b pb-2">
                              <User className="w-4.5 h-4.5 text-blue-700" />
                              Datos del Postulante
                            </span>
                            <div className="space-y-2 text-sm text-slate-600">
                              <p><strong>Nombres y Apellidos:</strong> {formState.personales.apellidoPaterno} {formState.personales.apellidoMaterno}, {formState.personales.nombres}</p>
                              <p><strong>Documento de Identidad:</strong> {formState.personales.tipoDocumento} - {formState.personales.numeroDocumento}</p>
                              <p><strong>Sede de Postulación:</strong> {formState.postulacion.sedeLocal} ({formState.postulacion.distritoPostulacion})</p>
                              <p><strong>Nivel y Grado:</strong> {formState.postulacion.nivelEducativo} - {formState.postulacion.gradoIngreso}</p>
                            </div>
                          </div>

                          {/* Datos de Contacto / Apoderado */}
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-3">
                            <span className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2 border-b pb-2">
                              <Heart className="w-4.5 h-4.5 text-red-600" />
                              Apoderado de Contacto
                            </span>
                            <div className="space-y-2 text-sm text-slate-600">
                              <p><strong>Nombre Completo:</strong> {formState.padresTutores.apoderado.apellidoPaterno} {formState.padresTutores.apoderado.apellidoMaterno}, {formState.padresTutores.apoderado.nombres}</p>
                              <p><strong>Celular de Contacto:</strong> {formState.padresTutores.apoderado.celularContacto}</p>
                              <p><strong>Correo Electrónico:</strong> {formState.padresTutores.apoderado.correoElectronico}</p>
                              <p><strong>Relación:</strong> {apoderadoTipo === 'papa' ? 'Papá' : apoderadoTipo === 'mama' ? 'Mamá' : 'Tutor / Otro'}</p>
                            </div>
                          </div>
                        </div>

                        {/* DECLARACIÓN JURADA DE VERACIDAD */}
                        <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2 border-b border-blue-150 pb-2">
                            <ShieldCheck className="w-5 h-5 text-blue-700" />
                            <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Declaración Jurada de Veracidad</h4>
                          </div>
                          <p className="text-xs sm:text-sm text-blue-950 leading-relaxed italic">
                            "Declaro bajo juramento que todos los datos consignados en esta pre-ficha de postulación rápida son verdaderos y de mi entera responsabilidad. Autorizo al Colegio Juventud Científica a verificar la autenticidad de los mismos. Entiendo que una vez aprobada mi pre-postulación, deberé completar los datos restantes obligatorios para continuar con el proceso de admisión."
                          </p>
                          <div className="pt-2">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={declaroVeracidad}
                                onChange={(e) => setDeclaroVeracidad(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                              />
                              <span className="text-sm font-bold text-blue-900">
                                Acepto la declaración jurada de pre-inscripción.
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                      {/* Family Member Sub-tabs headers */}
                      <div className="flex border-b border-slate-200">
                        {(['papa', 'mama', 'apoderado'] as const).map((tab) => {
                          const isSelected = activeFamiliarTab === tab;
                          const hasErrors = Object.keys(errors).some(errKey => errKey.startsWith(tab));
                          const memberData = formState.padresTutores[tab];
                          const label = tab === 'papa' ? 'Papá' : tab === 'mama' ? 'Mamá' : 'Apoderado Principal';
                          const isRequired = tab !== 'apoderado' ? !memberData.fallecido : formState.lugarAdicionales.responsableMatricula === 'Apoderado';
                          
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActiveFamiliarTab(tab)}
                              className={`flex-1 py-3 px-4 text-center font-bold text-sm border-b-2 transition duration-150 relative flex items-center justify-center gap-2 ${
                                isSelected 
                                  ? 'border-blue-600 text-blue-600 bg-blue-50/20' 
                                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <span>{label}</span>
                              {isRequired && <span className="text-red-500 font-normal">*</span>}
                              {memberData.fallecido && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Fallecido</span>}
                              {hasErrors && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-2 right-2"></span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Info Bar clarifying responsibility relationship */}
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Info className="w-4 h-4 text-indigo-600" />
                          <span>Responsable legal de matrícula asignado en Paso 3: <strong className="font-bold">{formState.lugarAdicionales.responsableMatricula === 'Padre' ? 'Papá' : formState.lugarAdicionales.responsableMatricula === 'Madre' ? 'Mamá' : 'Apoderado Principal'}</strong></span>
                        </div>
                        <span className="bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded text-[10px] uppercase">Requerido</span>
                      </div>

                      {/* Tab Content Panels */}
                      {(['papa', 'mama', 'apoderado'] as const).map((tab) => {
                        if (activeFamiliarTab !== tab) return null;
                        const fam = formState.padresTutores[tab];
                        const label = tab === 'papa' ? 'papa' : tab === 'mama' ? 'mama' : 'apoderado';
                        const displayTitle = tab === 'papa' ? 'Papá' : tab === 'mama' ? 'Mamá' : 'Apoderado Principal / Tutor';
                        const isDeceasedCheckboxAvailable = tab === 'papa' || tab === 'mama';

                        const handleFamiliarChange = (field: keyof FamiliarData, value: any) => {
                          setFormState(prev => ({
                            ...prev,
                            padresTutores: {
                              ...prev.padresTutores,
                              [tab]: {
                                ...prev.padresTutores[tab],
                                [field]: value
                              }
                            }
                          }));
                          clearFieldError(`${label}_${field}`);
                        };

                        return (
                          <div key={tab} className="space-y-6 relative">
                            {/* Option to copy from father or mother if tab is apoderado */}
                            {tab === 'apoderado' && (
                              <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/80 rounded-xl shadow-sm mb-6">
                                <label className="block text-sm font-bold text-slate-800 mb-3 uppercase tracking-tight flex items-center gap-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  ¿Quién asumirá como Apoderado Principal?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApoderadoTipo('papa');
                                      // Clear apoderado fields errors
                                      Object.keys(errors).forEach(errKey => {
                                        if (errKey.startsWith('apoderado')) {
                                          clearFieldError(errKey);
                                        }
                                      });
                                    }}
                                    className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-all duration-200 ${
                                      apoderadoTipo === 'papa' 
                                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${apoderadoTipo === 'papa' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                      {apoderadoTipo === 'papa' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-bold text-slate-800 block">Copiar de Papá</span>
                                      <span className="text-xs text-slate-500 truncate max-w-[150px] block">
                                        {formState.padresTutores.papa.nombres ? `${formState.padresTutores.papa.nombres} ${formState.padresTutores.papa.apellidoPaterno}` : 'Sin datos'}
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApoderadoTipo('mama');
                                      // Clear apoderado fields errors
                                      Object.keys(errors).forEach(errKey => {
                                        if (errKey.startsWith('apoderado')) {
                                          clearFieldError(errKey);
                                        }
                                      });
                                    }}
                                    className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-all duration-200 ${
                                      apoderadoTipo === 'mama' 
                                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${apoderadoTipo === 'mama' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                      {apoderadoTipo === 'mama' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-bold text-slate-800 block">Copiar de Mamá</span>
                                      <span className="text-xs text-slate-500 truncate max-w-[150px] block">
                                        {formState.padresTutores.mama.nombres ? `${formState.padresTutores.mama.nombres} ${formState.padresTutores.mama.apellidoPaterno}` : 'Sin datos'}
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApoderadoTipo('otro');
                                      // Clear apoderado fields data to start fresh or keep previous
                                      setFormState(prev => ({
                                        ...prev,
                                        padresTutores: {
                                          ...prev.padresTutores,
                                          apoderado: {
                                            fallecido: false,
                                            nombres: '',
                                            apellidoPaterno: '',
                                            apellidoMaterno: '',
                                            tipoDocumento: 'DNI',
                                            numeroDocumento: '',
                                            fechaNacimiento: '',
                                            celularContacto: '',
                                            correoElectronico: '',
                                            direccionDomicilio: '',
                                            gradoInstruccion: 'Superior Universitaria',
                                            profesionOcupacion: '',
                                            centroTrabajo: '',
                                            cargo: '',
                                            ingresosMensuales: '',
                                            horarioLaboral: ''
                                          }
                                        }
                                      }));
                                    }}
                                    className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-all duration-200 ${
                                      apoderadoTipo === 'otro' 
                                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${apoderadoTipo === 'otro' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                      {apoderadoTipo === 'otro' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-bold text-slate-800 block">Agregar uno nuevo</span>
                                      <span className="text-xs text-slate-500 block">Registrar otro tutor/familiar</span>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Deceased checkbox */}
                            {isDeceasedCheckboxAvailable && (
                              <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 flex items-center space-x-3">
                                <input 
                                  type="checkbox"
                                  id={`deceased_${tab}`}
                                  checked={fam.fallecido}
                                  onChange={(e) => {
                                    handleFamiliarChange('fallecido', e.target.checked);
                                    if (e.target.checked) {
                                      // Clear error validations when parent is marked deceased
                                      Object.keys(errors).forEach(errKey => {
                                        if (errKey.startsWith(label)) {
                                          clearFieldError(errKey);
                                        }
                                      });
                                    }
                                  }}
                                  className="w-4.5 h-4.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                />
                                <label htmlFor={`deceased_${tab}`} className="text-sm font-bold text-red-900 cursor-pointer">
                                  Marcar si el familiar ha Fallecido
                                </label>
                              </div>
                            )}

                            {/* Main Familiar fields container (disabled if deceased or synced) */}
                            <div className={`${(fam.fallecido || (tab === 'apoderado' && apoderadoTipo !== 'otro')) ? 'opacity-55 pointer-events-none select-none relative' : ''}`}>
                              {fam.fallecido && (
                                <div className="absolute inset-0 bg-white/40 z-10 flex items-center justify-center">
                                  <div className="bg-slate-900/90 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-bold">
                                    Información Omitida - Familiar Fallecido
                                  </div>
                                </div>
                              )}
                              {!fam.fallecido && tab === 'apoderado' && apoderadoTipo !== 'otro' && (
                                <div className="absolute inset-0 bg-white/25 z-10 flex items-center justify-center">
                                  <div className="bg-slate-900/95 text-white px-5 py-3.5 rounded-xl shadow-lg text-sm font-bold flex flex-col items-center gap-1.5 max-w-xs text-center border border-slate-700">
                                    <span className="flex items-center gap-1.5 text-blue-400">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Sincronizado con {apoderadoTipo === 'papa' ? 'Papá' : 'Mamá'}
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-300 leading-relaxed">
                                      Los datos del apoderado se actualizan automáticamente. Para modificarlos, edite la pestaña de {apoderadoTipo === 'papa' ? 'Papá' : 'Mamá'} o seleccione "Agregar uno nuevo".
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">DATOS CIVILES DE {displayTitle.toUpperCase()}</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Parentesco (solo lectura) */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-1.5">Parentesco / Relación</label>
                                    <input 
                                      type="text" 
                                      value={tab === 'papa' ? 'Padre (Papá)' : tab === 'mama' ? 'Madre (Mamá)' : 'Apoderado / Tutor'} 
                                      disabled 
                                      className="w-full rounded-lg border-slate-300 bg-slate-100 text-slate-500 text-sm p-2.5 cursor-not-allowed border"
                                    />
                                  </div>

                                  {/* Nombres */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombres <span className="text-red-500">*</span></label>
                                    <input 
                                      type="text"
                                      value={fam.nombres}
                                      onChange={(e) => handleFamiliarChange('nombres', e.target.value)}
                                      placeholder="Nombres de pila"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_nombres`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_nombres`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_nombres`]}
                                      </p>
                                    )}
                                  </div>

                                  {/* Apellido Paterno */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno <span className="text-red-500">*</span></label>
                                    <input 
                                      type="text"
                                      value={fam.apellidoPaterno}
                                      onChange={(e) => handleFamiliarChange('apellidoPaterno', e.target.value)}
                                      placeholder="Apellido paterno"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_apellidoPaterno`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_apellidoPaterno`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_apellidoPaterno`]}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Apellido Materno */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno <span className="text-red-500">*</span></label>
                                    <input 
                                      type="text"
                                      value={fam.apellidoMaterno}
                                      onChange={(e) => handleFamiliarChange('apellidoMaterno', e.target.value)}
                                      placeholder="Apellido materno"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_apellidoMaterno`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_apellidoMaterno`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_apellidoMaterno`]}
                                      </p>
                                    )}
                                  </div>

                                  {/* Tipo de Documento */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Documento</label>
                                    <select
                                      value={fam.tipoDocumento}
                                      onChange={(e) => handleFamiliarChange('tipoDocumento', e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    >
                                      {TIPOS_DOCUMENTO.map(td => (
                                        <option key={td} value={td}>{td}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Número de Documento */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Documento <span className="text-red-500">*</span></label>
                                    <input 
                                      type="text"
                                      value={fam.numeroDocumento}
                                      onChange={(e) => handleFamiliarChange('numeroDocumento', e.target.value)}
                                      placeholder="DNI o CE del familiar"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_numeroDocumento`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_numeroDocumento`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_numeroDocumento`]}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Fecha de Nacimiento */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Nacimiento</label>
                                    <input 
                                      type="date"
                                      value={fam.fechaNacimiento}
                                      onChange={(e) => handleFamiliarChange('fechaNacimiento', e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>

                                  {/* Celular de Contacto */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Celular de Contacto <span className="text-red-500">*</span></label>
                                    <input 
                                      type="text"
                                      value={fam.celularContacto}
                                      onChange={(e) => handleFamiliarChange('celularContacto', e.target.value)}
                                      placeholder="Mínimo 9 dígitos"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_celularContacto`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_celularContacto`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_celularContacto`]}
                                      </p>
                                    )}
                                  </div>

                                  {/* Correo Electrónico */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico <span className="text-red-500">*</span></label>
                                    <input 
                                      type="email"
                                      value={fam.correoElectronico}
                                      onChange={(e) => handleFamiliarChange('correoElectronico', e.target.value)}
                                      placeholder="correo@familiar.com"
                                      className={`w-full rounded-lg border shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${
                                        errors[`${label}_correoElectronico`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                                      }`}
                                    />
                                    {errors[`${label}_correoElectronico`] && (
                                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {errors[`${label}_correoElectronico`]}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Direccion Domicilio (Opcional) */}
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dirección de Domicilio <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                  <input 
                                    type="text"
                                    value={fam.direccionDomicilio}
                                    onChange={(e) => handleFamiliarChange('direccionDomicilio', e.target.value)}
                                    placeholder="Dejar en blanco si vive en la misma dirección de la familia"
                                    className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                  />
                                  <p className="text-xs text-slate-400 mt-1.5 italic">Nota: Si vive en el mismo domicilio que la familia, no es necesario completar este campo.</p>
                                </div>

                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider pt-4 border-t border-slate-100">DATOS ACADÉMICOS Y LABORALES</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Grado de Instrucción */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Grado de Instrucción</label>
                                    <select
                                      value={fam.gradoInstruccion}
                                      onChange={(e) => handleFamiliarChange('gradoInstruccion', e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    >
                                      {GRADOS_INSTRUCCION.map(gi => (
                                        <option key={gi} value={gi}>{gi}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Profesion u Ocupacion */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Profesión u Ocupación</label>
                                    <input 
                                      type="text"
                                      value={fam.profesionOcupacion}
                                      onChange={(e) => handleFamiliarChange('profesionOcupacion', e.target.value)}
                                      placeholder="Ej. Abogado, Comerciante"
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>

                                  {/* Centro de Trabajo */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Centro de Trabajo</label>
                                    <input 
                                      type="text"
                                      value={fam.centroTrabajo}
                                      onChange={(e) => handleFamiliarChange('centroTrabajo', e.target.value)}
                                      placeholder="Lugar de labores"
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  {/* Cargo */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo</label>
                                    <input 
                                      type="text"
                                      value={fam.cargo}
                                      onChange={(e) => handleFamiliarChange('cargo', e.target.value)}
                                      placeholder="Ej. Supervisor, Operario, Independiente"
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>

                                  {/* Ingresos Mensuales */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ingresos Mensuales Promedio</label>
                                    <input 
                                      type="text"
                                      value={fam.ingresosMensuales}
                                      onChange={(e) => handleFamiliarChange('ingresosMensuales', e.target.value)}
                                      placeholder="Ej. S/. 2,500"
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>

                                  {/* Horario Laboral */}
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Horario Laboral</label>
                                    <input 
                                      type="text"
                                      value={fam.horarioLaboral}
                                      onChange={(e) => handleFamiliarChange('horarioLaboral', e.target.value)}
                                      placeholder="Ej. 08:00 a 17:00"
                                      className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* BOTTOM MULTIPLE REGISTER BUTTON & ACTION */}
                      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl">
                        <div className="text-xs text-slate-500">
                          <strong className="block font-semibold text-slate-700">¿Tiene más hijos que postularán este año?</strong>
                          <span>Puede registrar la ficha del grupo familiar una sola vez y vincular múltiples alumnos.</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => triggerToast("ℹ️ El registro de múltiples postulantes está pre-habilitado en el sistema escolar. Sus datos familiares (FAM-3209) se conservarán.")}
                          className="text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 font-bold px-4 py-2.5 rounded-lg border border-blue-200 transition duration-150 flex items-center space-x-2 text-sm"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>+ Registrar Otro Hijo (Familia)</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                  {/* PASO 5: ENVIAR FICHA (RESUMEN) */}
                  {currentStep === 5 && !isFormSimple && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-sm flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Resumen de Postulación 2027:</strong> Por favor, verifique minuciosamente la exactitud de todos los datos recopilados antes de proceder a la firma legal y envío del expediente de admisión.
                        </div>
                      </div>

                      {/* APODERADO LEGAL RESPONSABLE */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2">
                            <User className="w-4.5 h-4.5 text-indigo-700" />
                            Apoderado Legal Responsable
                          </span>
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded uppercase">
                            Matrícula: {formState.lugarAdicionales.responsableMatricula}
                          </span>
                        </div>
                        {respDetails.valido ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Apellidos y Nombres:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.apellidoPaterno} {respDetails.data.apellidoMaterno}, {respDetails.data.nombres}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Documento de Identidad:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.tipoDocumento}: {respDetails.data.numeroDocumento}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Contacto Telefónico:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.celularContacto}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Correo Electrónico:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.correoElectronico}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Profesión u Ocupación:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.profesionOcupacion || 'No especificado'}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Ingresos Mensuales Promedio:</span>
                              <span className="font-semibold text-slate-800">{respDetails.data.ingresosMensuales || 'No especificado'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-red-50 text-red-800 rounded text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>Atención: Los datos de {respDetails.tipo} no están completos o se encuentra fallecido. Por favor regrese al Paso 5 para ingresar su información obligatoria.</span>
                          </div>
                        )}
                      </div>

                      {/* ALUMNOS POSTULANTES */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
                        <div className="border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2">
                            <School className="w-4.5 h-4.5 text-emerald-700" />
                            Alumnos Postulantes Inscritos
                          </span>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-150 space-y-3 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full mr-2">Postulante 1</span>
                              <strong className="text-slate-800 font-bold">
                                {formState.personales.apellidoPaterno || formState.personales.apellidoMaterno || formState.personales.nombres ? (
                                  `${formState.personales.apellidoPaterno} ${formState.personales.apellidoMaterno}, ${formState.personales.nombres}`
                                ) : (
                                  <span className="text-red-500 italic font-normal">Sin nombres completos en Paso 2</span>
                                )}
                              </strong>
                            </div>
                            <span className="text-xs text-slate-500">
                              Tipo: <strong className="text-slate-800 uppercase font-semibold">{formState.postulacion.tipoAlumno === 'nuevo' ? 'Nuevo / Externo' : 'Antiguo / Ratificación'}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Sede de Ingreso:</span>
                              <span className="font-semibold text-slate-800">{formState.postulacion.sedeLocal ? `${formState.postulacion.sedeLocal} (${formState.postulacion.distritoPostulacion})` : <span className="text-red-500 italic">No asignado</span>}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Grado y Nivel:</span>
                              <span className="font-semibold text-slate-800">{formState.postulacion.gradoIngreso || <span className="text-red-500 italic">No asignado</span>} ({formState.postulacion.nivelEducativo || 'Nivel'})</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Turno y Proceso:</span>
                              <span className="font-semibold text-slate-800">{formState.postulacion.turnoPreferencia} / {formState.postulacion.anoProceso}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-slate-100/60">
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Documento de Identidad:</span>
                              <span className="font-semibold text-slate-800">{formState.personales.tipoDocumento}: {formState.personales.numeroDocumento || <span className="text-red-500 italic">Falta número</span>}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Fecha Nacimiento:</span>
                              <span className="font-semibold text-slate-800">{formState.personales.fechaNacimiento || <span className="text-red-500 italic">Falta fecha</span>}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-slate-100/60">
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Seguro de Accidentes:</span>
                              <span className="font-semibold text-slate-800">{formState.lugarAdicionales.cuentaSeguro === 'Si' ? `Sí (${formState.lugarAdicionales.aseguradora})` : 'No cuenta'}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Diagnóstico Médico/Psicológico:</span>
                              <span className="font-semibold text-slate-800">{formState.lugarAdicionales.tieneDiagnostico === 'Si' ? `Sí (${formState.lugarAdicionales.diagnosticoDetalle})` : 'No presenta'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-slate-100/60">
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Religión y Asistencia:</span>
                              <span className="font-semibold text-slate-800">{formState.lugarAdicionales.religion ? `${formState.lugarAdicionales.religion} ${formState.lugarAdicionales.asisteIglesia === 'Si' ? `(Asiste a: ${formState.lugarAdicionales.iglesiaParroquia})` : '(No asiste a iglesia)'}` : <span className="text-red-500 italic">Falta religión</span>}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400 font-medium">Sacramentos:</span>
                              <span className="font-semibold text-slate-800">
                                {[
                                  formState.lugarAdicionales.bautizado ? 'Bautizado(a)' : null,
                                  formState.lugarAdicionales.primeraComunion ? 'Primera Comunión' : null
                                ].filter(Boolean).join(', ') || 'Ninguno'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DECLARACION JURADA DE VERACIDAD */}
                      <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3 shadow-xs">
                        <div className="flex items-center space-x-2 border-b border-blue-150 pb-2">
                          <ShieldCheck className="w-5 h-5 text-blue-700" />
                          <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Declaración Jurada de Veracidad</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-blue-950 leading-relaxed italic">
                          "Declaro bajo juramento que todos los datos consignados en esta ficha de postulación son verdaderos y de mi entera responsabilidad. Autorizo al Colegio Juventud Científica a verificar la autenticidad de los mismos. Comprendo que cualquier falsedad o inexactitud anulará el proceso de postulación de forma inmediata, perdiendo la reserva de vacante temporal."
                        </p>
                        <div className="pt-2">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={declaroVeracidad}
                              onChange={(e) => setDeclaroVeracidad(e.target.checked)}
                              className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-blue-900">
                              Acepto la declaración jurada y valido toda la información registrada.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTOM PROGRESS CONTROLS */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300 shadow-sm transition duration-150 flex items-center space-x-2 text-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Atrás</span>
                      </button>
                    )}
                  </div>

                  <div>
                    {currentStep < steps.length ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition duration-150 flex items-center space-x-2 text-sm hover:scale-[1.02] active:scale-95"
                      >
                        <span>Continuar</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={!declaroVeracidad || (!isFormSimple && !respDetails.valido)}
                        className={`font-bold py-2.5 px-6 rounded-xl shadow-md transition duration-150 flex items-center space-x-2 text-sm ${
                          declaroVeracidad && (isFormSimple || respDetails.valido)
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-95 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        <span>{isFormSimple ? 'Enviar Pre-Inscripción Rápida' : 'Enviar Solicitud de Admisión'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
        ) : (
          /* SUBMITTED SUCCESS VIEW */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header of Constancia */}
            <div className="bg-slate-900 text-white p-8 relative overflow-hidden text-center border-b-4 border-amber-500">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-transparent"></div>
              <div className="relative z-10 space-y-4">
                <div className="bg-amber-500 text-slate-950 p-4 rounded-full w-fit mx-auto shadow-xl">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-amber-400 font-bold tracking-widest text-xs uppercase block">PROCESO DE ADMISIÓN 2027</span>
                  <h2 className="text-3xl font-extrabold tracking-tight mt-1">¡Solicitud Recibida con Éxito!</h2>
                  <p className="text-slate-300 text-sm mt-2 max-w-lg mx-auto">
                    Su postulación ha sido registrada en el sistema de admisión del Colegio Juventud Científica. El pre-registro de vacante queda temporalmente asignado.
                  </p>
                </div>
              </div>
            </div>

            {/* Constancia Details */}
            <div className="p-8 space-y-6">
              {/* Credentials Box */}
              {newlyRegisteredCredentials && (
                <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">¡Cuenta de Acceso Generada!</h3>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Utilice las siguientes credenciales para realizar el seguimiento en tiempo real de la admisión, cargar los documentos obligatorios, agendar su cita psicopedagógica y confirmar su matrícula con asignación de aula:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200/60 font-mono text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Usuario de Acceso</span>
                      <strong className="text-xs text-slate-800 font-extrabold select-all">{newlyRegisteredCredentials.username}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Contraseña (DNI Apoderado)</span>
                      <strong className="text-xs text-slate-800 font-extrabold select-all">{newlyRegisteredCredentials.password}</strong>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Log them in immediately and redirect to dashboard
                      const found = records.find(r => r.id === newlyRegisteredCredentials.username || r.username === newlyRegisteredCredentials.username || r.formState?.fichaFamilia?.codigoFamilia === newlyRegisteredCredentials.username);
                      if (found) {
                        setCurrentUser(found);
                        setActiveView('dashboard');
                        setSubmitted(false);
                        triggerToast("✨ ¡Bienvenido al Portal de Admisión!");
                      } else {
                        // fallback if record took a tick to propagate
                        const fallbackRecord = {
                          id: newlyRegisteredCredentials.username,
                          username: newlyRegisteredCredentials.username,
                          password: newlyRegisteredCredentials.password,
                          formState,
                          documents: {
                            dniPostulante: null,
                            dniApoderado: null,
                            libretaEstudios: null,
                            constanciaNoAdeudo: null
                          },
                          appointment: null,
                          status: 'documents_pending',
                          assignedClassroom: null
                        };
                        setCurrentUser(fallbackRecord);
                        setActiveView('dashboard');
                        setSubmitted(false);
                        triggerToast("✨ ¡Bienvenido al Portal de Admisión!");
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer hover:scale-101 active:scale-95"
                  >
                    <LogIn className="w-4.5 h-4.5" />
                    <span>Ingresar al Portal Automáticamente (Auto-login)</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 text-sm">
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Código de Expediente Familiar:</span>
                  <strong className="text-base text-slate-800 font-mono font-bold bg-white px-3 py-1 rounded border border-slate-200">{formState.fichaFamilia.codigoFamilia}</strong>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Fecha de Registro:</span>
                  <strong className="text-base text-slate-800 font-bold">07 de Julio, 2026 (21:30)</strong>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Sede del Postulante:</span>
                  <strong className="text-base text-slate-800 font-bold">{formState.postulacion.sedeLocal} ({formState.postulacion.distritoPostulacion})</strong>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Grado / Nivel de Ingreso:</span>
                  <strong className="text-base text-slate-800 font-bold text-blue-700">{formState.postulacion.gradoIngreso}</strong>
                </div>
              </div>

              {/* Steps for what comes next */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Próximos Pasos del Proceso de Selección
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2 relative">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</div>
                    <strong className="block text-slate-800 font-bold">Carga de Documentos</strong>
                    <span className="text-slate-500 leading-relaxed block text-xs">
                      Debe ingresar al portal y cargar los archivos de identidad y estudios solicitados para su validación oficial.
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</div>
                    <strong className="block text-slate-800 font-bold">Entrevista Psicopedagógica</strong>
                    <span className="text-slate-500 leading-relaxed block text-xs">
                      Reserve su cita con nuestro psicólogo eligiendo día y hora dentro del calendario interactivo del portal.
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</div>
                    <strong className="block text-slate-800 font-bold">Matrícula & Aula</strong>
                    <span className="text-slate-500 leading-relaxed block text-xs">
                      Una vez verificado todo, confirme su matrícula en un clic para recibir la asignación automática de pabellón y aula.
                    </span>
                  </div>
                </div>
              </div>

              {/* Call to action & print buttons */}
              <div className="pt-6 border-t border-slate-150 flex flex-col sm:flex-row gap-4 justify-between items-center w-full">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      downloadConstanciaPDF(formState);
                      triggerToast("📥 Descargando Expediente Completo en PDF...");
                    }}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition duration-150 flex items-center justify-center space-x-2 text-sm shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      handleRegisterSibling(formState);
                    }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-5 rounded-xl border border-blue-600 shadow-md transition duration-150 text-sm text-center cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Registrar Siguiente Hijo (Mismo Apoderado)</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSubmitted(false);
                      setCurrentStep(1);
                      setFormState(initialFormState);
                      setSiblingFamilyCode(null);
                      setDeclaroVeracidad(false);
                      setNewlyRegisteredCredentials(null);
                      triggerToast("Formulario reiniciado.");
                    }}
                    className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-5 rounded-xl border border-slate-300 shadow-sm transition duration-150 text-sm text-center cursor-pointer"
                  >
                    Registrar Desde Cero (Nueva Familia)
                  </button>
                </div>
              </div>
            </div>
            
            {/* Quick school contact footer */}
            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>(01) 456-7890</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>admision@juventudcientifica.edu.pe</span>
                </span>
              </div>
              <span>© 2026 Colegio Juventud Científica. Todos los derechos reservados.</span>
            </div>
          </motion.div>
        )}
      </main>

      {/* Printable version of the Constancia (Only visible during print via CSS) */}
      {currentUser && activeView === 'dashboard' && (
        <PrintableConstancia formState={currentUser.formState} />
      )}
      {submitted && !currentUser && (
        <PrintableConstancia formState={formState} />
      )}
    </div>
  );
}
