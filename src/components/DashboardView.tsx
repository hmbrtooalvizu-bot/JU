import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  User, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Sparkles,
  Info,
  Phone,
  Mail,
  Heart,
  FileText,
  Upload,
  Download,
  Check,
  Copy,
  Clock,
  Lock,
  Users,
  PlusCircle
} from 'lucide-react';
import { downloadConstanciaPDF } from '../utils/pdfGenerator';

interface DashboardViewProps {
  currentUser: any;
  records: any[];
  saveRecord: (record: any) => void;
  setCurrentUser: (record: any) => void;
  triggerToast: (msg: string) => void;
  onRegisterSibling?: (siblingFormState: any) => void;
}

export default function DashboardView({ 
  currentUser, 
  records, 
  saveRecord, 
  setCurrentUser, 
  triggerToast,
  onRegisterSibling
}: DashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ficha' | 'documentos' | 'cita' | 'matricula'>('ficha');
  
  // States for completion of remaining fields
  const [isCompletingForm, setIsCompletingForm] = useState<boolean>(false);
  const [completionStep, setCompletionStep] = useState<number>(1);
  const [completionState, setCompletionState] = useState<any>(null);
  const [compErrors, setCompErrors] = useState<any>({});
  const [declaroComp, setDeclaroComp] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser && currentUser.formState && !completionState) {
      setCompletionState(JSON.parse(JSON.stringify(currentUser.formState)));
    }
  }, [currentUser]);
  
  // Date and Time selection states for psychological appointment
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [occupiedSlots, setOccupiedSlots] = useState<{ [dateKey: string]: string[] }>({});
  
  // Document uploading simulator states
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Generate 10 upcoming business days (excluding Sundays) starting tomorrow
  const getUpcomingDates = () => {
    const dates = [];
    const today = new Date();
    let current = new Date(today);
    
    while (dates.length < 10) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) { // Skip Sundays
        const formatted = current.toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
        dates.push({
          key: current.toISOString().split('T')[0],
          label: formatted.charAt(0).toUpperCase() + formatted.slice(1)
        });
      }
    }
    return dates;
  };

  const datesList = getUpcomingDates();

  // Set default date if empty
  useEffect(() => {
    if (datesList.length > 0 && !selectedDate) {
      setSelectedDate(datesList[0].key);
    }
  }, [selectedDate]);

  // Seed occupied slots per date dynamically to simulate occupied times by other families
  useEffect(() => {
    const seed: { [dateKey: string]: string[] } = {};
    datesList.forEach((d) => {
      // Seed 2-3 slots randomly as busy, but deterministic per date to look real
      const dayNum = parseInt(d.key.split('-')[2]);
      if (dayNum % 2 === 0) {
        seed[d.key] = ['09:00 AM - 10:00 AM', '03:00 PM - 04:00 PM'];
      } else {
        seed[d.key] = ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '04:00 PM - 05:00 PM'];
      }
    });
    setOccupiedSlots(seed);
  }, []);

  const timeSlots = [
    '08:00 AM - 09:00 AM',
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
  ];

  // Document management helpers
  const docsList = [
    { key: 'dniPostulante', label: 'Copia del DNI del Postulante' },
    { key: 'dniApoderado', label: 'Copia del DNI del Apoderado Legal' },
    { key: 'libretaEstudios', label: 'Copia de Libreta de Notas / Certificado del año anterior' },
    { key: 'constanciaNoAdeudo', label: 'Constancia de No Adeudo de pensiones del nido/colegio de procedencia' },
  ];

  const handleSimulatedUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDoc(docKey);
      setUploadProgress(10);

      // Simulate step-by-step progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              // Update state
              const updatedDocs = {
                ...currentUser.documents,
                [docKey]: file.name
              };
              
              // Recalculate status
              const totalUploaded = Object.values(updatedDocs).filter(Boolean).length;
              const newStatus = totalUploaded === 4 ? 'appointment_pending' : 'documents_pending';

              const updatedRecord = {
                ...currentUser,
                documents: updatedDocs,
                status: currentUser.status === 'documents_pending' ? newStatus : currentUser.status
              };

              saveRecord(updatedRecord);
              setCurrentUser(updatedRecord);
              setUploadingDoc(null);
              triggerToast(`✨ El documento "${file.name}" se cargó con éxito.`);
            }, 300);
            return 100;
          }
          return prev + 30;
        });
      }, 200);
    }
  };

  const handleRemoveDoc = (docKey: string) => {
    const updatedDocs = {
      ...currentUser.documents,
      [docKey]: null
    };

    const updatedRecord = {
      ...currentUser,
      documents: updatedDocs,
      status: 'documents_pending' // Revert status if documents are incomplete
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast("🗑️ Documento removido.");
  };

  // Appointment scheduling helpers
  const handleBookAppointment = (slot: string) => {
    const dateLabel = datesList.find(d => d.key === selectedDate)?.label || selectedDate;
    
    const updatedRecord = {
      ...currentUser,
      appointment: {
        dateKey: selectedDate,
        dateLabel,
        timeSlot: slot
      },
      status: currentUser.status === 'appointment_pending' || currentUser.status === 'documents_pending' 
        ? 'matricula_pending' 
        : currentUser.status
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast(`📅 Cita reservada para el ${dateLabel} en el horario de ${slot}.`);
  };

  const handleCancelAppointment = () => {
    const updatedRecord = {
      ...currentUser,
      appointment: null,
      status: currentUser.status === 'matricula_pending' ? 'appointment_pending' : currentUser.status
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast("📅 Cita cancelada. Por favor agende una nueva fecha.");
  };

  // Classroom assignment resolver
  const getClassroomByGrade = (grade: string) => {
    if (grade.includes('Guardería') || grade.includes('3 años')) {
      return 'Aula Gotitas de Amor (Pabellón Inicial - Piso 1)';
    } else if (grade.includes('4 años')) {
      return 'Aula Rayitos de Sol (Pabellón Inicial - Piso 1)';
    } else if (grade.includes('5 años')) {
      return 'Aula Estrellitas del Saber (Pabellón Inicial - Piso 2)';
    } else if (grade.includes('1er Grado')) {
      return 'Aula Newton 101 (Pabellón Primaria - Piso 1)';
    } else if (grade.includes('2do Grado')) {
      return 'Aula Galileo 102 (Pabellón Primaria - Piso 1)';
    } else if (grade.includes('3er Grado')) {
      return 'Aula Tesla 103 (Pabellón Primaria - Piso 2)';
    } else if (grade.includes('4to Grado')) {
      return 'Aula Einstein 104 (Pabellón Primaria - Piso 2)';
    } else if (grade.includes('5to Grado')) {
      return 'Aula Darwin 201 (Pabellón Primaria - Piso 3)';
    } else if (grade.includes('6to Grado')) {
      return 'Aula Pasteur 202 (Pabellón Primaria - Piso 3)';
    } else if (grade.includes('1er Año')) {
      return 'Aula Marie Curie 301 (Pabellón Secundaria - Piso 1)';
    } else if (grade.includes('2do Año')) {
      return 'Aula Hawking 302 (Pabellón Secundaria - Piso 1)';
    } else if (grade.includes('3er Año')) {
      return 'Aula Turing 303 (Pabellón Secundaria - Piso 2)';
    } else if (grade.includes('4to Año')) {
      return 'Aula Feynman 304 (Pabellón Secundaria - Piso 2)';
    } else {
      return 'Aula Maxwell 401 (Pabellón Secundaria - Piso 3)';
    }
  };

  const handleConfirmMatricula = () => {
    const assigned = getClassroomByGrade(currentUser.formState.postulacion.gradoIngreso);
    const updatedRecord = {
      ...currentUser,
      status: 'matriculado',
      assignedClassroom: assigned
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast("🎉 ¡Felicidades! Se ha completado el proceso de Matrícula y asignación de Aula.");
  };

  // Pre-calculate status values
  const isLockedState = currentUser.status === 'pending_approval' || currentUser.status === 'ready_for_completion';
  const student = currentUser.formState.personales;
  const grade = currentUser.formState.postulacion.gradoIngreso;
  const level = currentUser.formState.postulacion.nivelEducativo;
  const sede = currentUser.formState.postulacion.sedeLocal;

  const uploadedCount = Object.values(currentUser.documents || {}).filter(Boolean).length;
  const isDocsComplete = uploadedCount === 4;
  const isApptBooked = !!currentUser.appointment;
  const isMatriculado = currentUser.status === 'matriculado';

  // Copy family credentials to clipboard
  const copyCredentials = () => {
    const credText = `Portal Admisión Juventud Científica 2027\nUsuario: ${currentUser.username}\nContraseña: ${currentUser.password}`;
    navigator.clipboard.writeText(credText);
    triggerToast("📋 Datos de acceso copiados al portapapeles.");
  };

  // Find all records belonging to the same family code
  const familyRecords = React.useMemo(() => {
    if (!currentUser || !currentUser.formState?.fichaFamilia?.codigoFamilia) return [];
    return records.filter(r => 
      !r.isDeleted && 
      (r.formState?.fichaFamilia?.codigoFamilia === currentUser.formState?.fichaFamilia?.codigoFamilia || 
       r.username === currentUser.username)
    );
  }, [records, currentUser]);

  return (
    <div className="w-full max-w-5xl space-y-6">
      
      {/* MULTI-CHILD EXPEDIENT SWITCHER & REGISTRATION BUTTON */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">
              Expedientes Familiares Vinculados
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            {familyRecords.length > 1 
              ? `Usted tiene ${familyRecords.length} hijos registrados bajo la misma familia. Seleccione un alumno para visualizar o actualizar su expediente individual.`
              : 'Usted puede registrar y gestionar múltiples hijos (hermanos) utilizando su mismo usuario de apoderado.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {familyRecords.length > 1 && (
            <div className="flex gap-1.5 flex-wrap bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 w-full sm:w-auto">
              {familyRecords.map((rec) => {
                const isSelected = rec.id === currentUser.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setCurrentUser(rec);
                      triggerToast(`🔄 Expediente cambiado: ${rec.formState.personales.nombres}`);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-black transition cursor-pointer select-none uppercase tracking-tight flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-xs">👶</span>
                    {rec.formState.personales.nombres.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}

          {onRegisterSibling && (
            <button
              type="button"
              onClick={() => onRegisterSibling(currentUser.formState)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[11px] transition-all duration-150 flex items-center gap-2 shadow-lg hover:scale-101 active:scale-95 cursor-pointer uppercase tracking-wider w-full sm:w-auto justify-center"
            >
              <PlusCircle className="w-4 h-4" />
              Registrar Otro Hijo
            </button>
          )}
        </div>
      </div>
      
      {/* 1. Header Banner & Student Profile */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 p-6 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-navy text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-inner shrink-0 uppercase">
            {student.nombres.charAt(0)}
            {student.apellidoPaterno.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 leading-tight uppercase">
                {student.nombres} {student.apellidoPaterno} {student.apellidoMaterno}
              </h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold py-0.5 px-2 rounded-full uppercase">
                Código: {currentUser.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-brand-blue" />
              <span>Sede: <strong>{sede || 'Principal'}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Grado: <strong>{grade}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 capitalize">Nivel: {level}</span>
            </p>
          </div>
        </div>

        {/* Credentials reminder block */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="space-y-0.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Credenciales del Alumno</span>
            <span className="block text-xs font-mono font-bold text-slate-800">U: {currentUser.username} | P: {currentUser.password}</span>
          </div>
          <button 
            onClick={copyCredentials} 
            className="text-slate-500 hover:text-brand-blue p-2 bg-white hover:bg-slate-100 rounded-xl transition shadow-xs border cursor-pointer"
            title="Copiar credenciales"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Process Tracking Bar (Interactive steps status) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-4 gap-3 text-center no-print">
        {/* Step 1: Ficha */}
        <div className="p-3 bg-green-50/50 rounded-2xl border border-green-200/50 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-xs mb-1.5">
            ✓
          </div>
          <span className="block text-xs font-extrabold text-slate-800">1. Ficha Técnica</span>
          <span className="block text-[10px] text-green-600 font-bold mt-0.5">Completado</span>
        </div>

        {/* Step 2: Documents */}
        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
          isDocsComplete 
            ? 'bg-green-50/50 border-green-200/50' 
            : 'bg-amber-50/50 border-amber-200/50'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-xs mb-1.5 ${
            isDocsComplete ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {isDocsComplete ? '✓' : '2'}
          </div>
          <span className="block text-xs font-extrabold text-slate-800">2. Documentos</span>
          <span className={`block text-[10px] font-bold mt-0.5 ${
            isDocsComplete ? 'text-green-600' : 'text-amber-600 animate-pulse'
          }`}>
            {isDocsComplete ? 'Completado' : `Cargados: ${uploadedCount} de 4`}
          </span>
        </div>

        {/* Step 3: Appointment */}
        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
          isApptBooked 
            ? 'bg-green-50/50 border-green-200/50' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-xs mb-1.5 ${
            isApptBooked ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
          }`}>
            {isApptBooked ? '✓' : '3'}
          </div>
          <span className="block text-xs font-extrabold text-slate-800">3. Cita Psicopedagógica</span>
          <span className={`block text-[10px] font-bold mt-0.5 ${
            isApptBooked ? 'text-green-600' : 'text-slate-500'
          }`}>
            {isApptBooked ? 'Agendado' : 'Pendiente'}
          </span>
        </div>

        {/* Step 4: Matricula & Class */}
        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
          isMatriculado 
            ? 'bg-green-50/50 border-green-200/50' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-xs mb-1.5 ${
            isMatriculado ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
          }`}>
            {isMatriculado ? '✓' : '4'}
          </div>
          <span className="block text-xs font-extrabold text-slate-800">4. Matrícula & Aula</span>
          <span className={`block text-[10px] font-bold mt-0.5 ${
            isMatriculado ? 'text-green-600' : 'text-slate-500'
          }`}>
            {isMatriculado ? 'Matriculado' : 'Pendiente'}
          </span>
        </div>
      </div>

      {/* 3. Navigation Inner Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 no-print">
        <button
          onClick={() => setActiveSubTab('ficha')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 shrink-0 border-b-2 cursor-pointer ${
            activeSubTab === 'ficha'
              ? 'border-brand-navy text-brand-navy font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ficha & Constancia PDF
        </button>

        <button
          onClick={() => {
            if (isLockedState) {
              triggerToast("🔒 Esta sección estará disponible después de que el Administrador apruebe su solicitud y complete la ficha técnica.");
            } else {
              setActiveSubTab('documentos');
            }
          }}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 shrink-0 border-b-2 ${
            isLockedState 
              ? 'text-slate-350 cursor-not-allowed border-transparent'
              : activeSubTab === 'documentos'
                ? 'border-brand-navy text-brand-navy font-extrabold cursor-pointer'
                : 'border-transparent text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          {isLockedState ? <Lock className="w-3.5 h-3.5 text-slate-300" /> : <Upload className="w-4 h-4" />}
          Subir Documentos
        </button>

        <button
          onClick={() => {
            if (isLockedState) {
              triggerToast("🔒 Esta sección estará disponible después de que el Administrador apruebe su solicitud y complete la ficha técnica.");
            } else {
              setActiveSubTab('cita');
            }
          }}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 shrink-0 border-b-2 ${
            isLockedState 
              ? 'text-slate-350 cursor-not-allowed border-transparent'
              : activeSubTab === 'cita'
                ? 'border-brand-navy text-brand-navy font-extrabold cursor-pointer'
                : 'border-transparent text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          {isLockedState ? <Lock className="w-3.5 h-3.5 text-slate-300" /> : <Calendar className="w-4 h-4" />}
          Cita Psicológica
        </button>

        <button
          onClick={() => {
            if (isLockedState) {
              triggerToast("🔒 Esta sección estará disponible después de que el Administrador apruebe su solicitud y complete la ficha técnica.");
            } else {
              setActiveSubTab('matricula');
            }
          }}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 shrink-0 border-b-2 ${
            isLockedState 
              ? 'text-slate-350 cursor-not-allowed border-transparent'
              : activeSubTab === 'matricula'
                ? 'border-brand-navy text-brand-navy font-extrabold cursor-pointer'
                : 'border-transparent text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          {isLockedState ? <Lock className="w-3.5 h-3.5 text-slate-300" /> : <ShieldCheck className="w-4 h-4" />}
          Matrícula & Aula
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="no-print">
        {activeSubTab === 'ficha' && (
          currentUser.status === 'pending_approval' ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center space-y-6 max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Pre-Inscripción Recibida Exitosamente
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase">Solicitud en Proceso de Aprobación</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Estimada familia: Los datos iniciales de su pre-ficha de admisión rápida han sido registrados correctamente en nuestro sistema escolar. 
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-left border text-xs text-slate-500 space-y-2 max-w-md mx-auto mt-4">
                  <p><strong>Postulante:</strong> {student.nombres} {student.apellidoPaterno} {student.apellidoMaterno}</p>
                  <p><strong>Grado solicitado:</strong> {grade} ({level})</p>
                  <p><strong>Sede:</strong> {sede || 'Principal'}</p>
                  <p><strong>Estado:</strong> <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-sm">Pendiente de Aprobación</span></p>
                </div>
                <p className="text-xs text-slate-500 pt-4">
                  💡 <strong>¿Qué sigue?</strong> Una vez aprobada su solicitud por la Comisión de Admisión, podrá completar el resto de la ficha técnica (datos de nacimiento, religión, información de los padres, etc.) para desbloquear los siguientes pasos (documentos y cita). Recibirá una notificación a la brevedad.
                </p>
              </div>
            </div>
          ) : currentUser.status === 'ready_for_completion' ? (
            isCompletingForm ? (
              // STEPPER FOR COMPLETING THE FORM INLINE
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
                {/* Stepper Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 uppercase">Completar Ficha Técnica de Admisión</h3>
                    <p className="text-xs text-slate-500">Por favor complete la información faltante solicitada a continuación.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCompletingForm(false);
                      setCompletionStep(1);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Volver
                  </button>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-2 max-w-md mx-auto py-2">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        completionStep === s 
                          ? 'bg-blue-600 text-white' 
                          : completionStep > s 
                            ? 'bg-green-500 text-white' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {completionStep > s ? '✓' : s}
                      </div>
                      {s < 4 && <div className={`h-1 flex-1 rounded-full ${completionStep > s ? 'bg-green-500' : 'bg-slate-150'}`}></div>}
                    </div>
                  ))}
                </div>

                {/* FORM STEPS CONTENT */}
                {completionStep === 1 && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Paso 1: Lugar de Nacimiento, Religión y Seguro
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Lugar de Nacimiento (Clínica/Hospital/Domicilio) <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={completionState?.lugarAdicionales?.lugarNacimiento || ''}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, lugarNacimiento: e.target.value }
                          }))}
                          placeholder="Ej. Clínica Delgado, Hospital Rebagliati"
                          className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                            compErrors.lugarNacimiento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                          }`}
                        />
                        {compErrors.lugarNacimiento && <p className="text-xs text-red-500 mt-1">{compErrors.lugarNacimiento}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">¿Tiene Seguro de Accidentes? <span className="text-red-500">*</span></label>
                        <select 
                          value={completionState?.lugarAdicionales?.cuentaSeguro || 'No'}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, cuentaSeguro: e.target.value }
                          }))}
                          className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 bg-white"
                        >
                          <option value="No">No cuenta con seguro</option>
                          <option value="Si">Sí cuenta con seguro</option>
                        </select>
                      </div>

                      {completionState?.lugarAdicionales?.cuentaSeguro === 'Si' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Compañía Aseguradora <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.lugarAdicionales?.aseguradora || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              lugarAdicionales: { ...prev.lugarAdicionales, aseguradora: e.target.value }
                            }))}
                            placeholder="Ej. Rimac, Pacifico, Essalud"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.aseguradora ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.aseguradora && <p className="text-xs text-red-500 mt-1">{compErrors.aseguradora}</p>}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Religión que profesa el Postulante <span className="text-red-500">*</span></label>
                        <select 
                          value={completionState?.lugarAdicionales?.religionPostulante || 'Católica'}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, religionPostulante: e.target.value }
                          }))}
                          className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 bg-white"
                        >
                          <option value="Católica">Católica</option>
                          <option value="Evangélica">Evangélica</option>
                          <option value="Mormón">Mormón</option>
                          <option value="Testigo de Jehová">Testigo de Jehová</option>
                          <option value="Ninguna / Otra">Ninguna / Otra</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">¿Con quién vive el Postulante? <span className="text-red-500">*</span></label>
                        <select 
                          value={completionState?.lugarAdicionales?.viveCon || 'Ambos Padres'}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, viveCon: e.target.value }
                          }))}
                          className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 bg-white"
                        >
                          <option value="Ambos Padres">Ambos Padres</option>
                          <option value="Solo Madre">Solo Madre</option>
                          <option value="Solo Padre">Solo Padre</option>
                          <option value="Apoderado">Apoderado / Abuelos / Tutor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Responsable Directo de Matrícula <span className="text-red-500">*</span></label>
                        <select 
                          value={completionState?.lugarAdicionales?.responsableMatricula || 'Padre'}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, responsableMatricula: e.target.value }
                          }))}
                          className="w-full rounded-lg border border-slate-300 shadow-sm text-sm p-2.5 bg-white"
                        >
                          <option value="Padre">El Papá</option>
                          <option value="Madre">La Mamá</option>
                          <option value="Apoderado">El Apoderado de Contacto</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={completionState?.lugarAdicionales?.bautizado || false}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, bautizado: e.target.checked }
                          }))}
                          className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-700 uppercase">El postulante está Bautizado(a)</span>
                      </label>

                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={completionState?.lugarAdicionales?.primeraComunion || false}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            lugarAdicionales: { ...prev.lugarAdicionales, primeraComunion: e.target.checked }
                          }))}
                          className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-700 uppercase">Hizo la Primera Comunión</span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <button 
                        onClick={() => {
                          const errs: any = {};
                          if (!completionState?.lugarAdicionales?.lugarNacimiento?.trim()) {
                            errs.lugarNacimiento = "Debe especificar el lugar de nacimiento.";
                          }
                          if (completionState?.lugarAdicionales?.cuentaSeguro === 'Si' && !completionState?.lugarAdicionales?.aseguradora?.trim()) {
                            errs.aseguradora = "Debe especificar la compañía de seguro.";
                          }
                          if (Object.keys(errs).length > 0) {
                            setCompErrors(errs);
                            triggerToast("⚠️ Por favor complete los campos obligatorios.");
                          } else {
                            setCompErrors({});
                            setCompletionStep(2);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Siguiente (Datos del Padre)
                      </button>
                    </div>
                  </div>
                )}

                {completionStep === 2 && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Paso 2: Datos Detallados del Padre (Papá)
                      </span>
                      <label className="flex items-center space-x-2 text-xs font-bold text-red-600 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={completionState?.padresTutores?.papa?.fallecido || false}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            padresTutores: {
                              ...prev.padresTutores,
                              papa: { ...prev.padresTutores.papa, fallecido: e.target.checked }
                            }
                          }))}
                          className="w-4 h-4 text-red-600 rounded border-red-300"
                        />
                        <span>MARCAR COMO FALLECIDO</span>
                      </label>
                    </h4>

                    {completionState?.padresTutores?.papa?.fallecido ? (
                      <div className="p-5 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs">
                        Usted ha marcado al Padre como Fallecido. Los campos correspondientes no serán requeridos para la ficha técnica escolar.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nombres del Padre <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.papa?.nombres || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                papa: { ...prev.padresTutores.papa, nombres: e.target.value }
                              }
                            }))}
                            placeholder="Nombres"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.papa_nombres ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.papa_nombres && <p className="text-xs text-red-500 mt-1">{compErrors.papa_nombres}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Apellido Paterno <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.papa?.apellidoPaterno || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                papa: { ...prev.padresTutores.papa, apellidoPaterno: e.target.value }
                              }
                            }))}
                            placeholder="Apellido Paterno"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.papa_apellidoPaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.papa_apellidoPaterno && <p className="text-xs text-red-500 mt-1">{compErrors.papa_apellidoPaterno}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Apellido Materno <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.papa?.apellidoMaterno || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                papa: { ...prev.padresTutores.papa, apellidoMaterno: e.target.value }
                              }
                            }))}
                            placeholder="Apellido Materno"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.papa_apellidoMaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.papa_apellidoMaterno && <p className="text-xs text-red-500 mt-1">{compErrors.papa_apellidoMaterno}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Documento Identidad <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <select 
                              value={completionState?.padresTutores?.papa?.tipoDocumento || 'DNI'}
                              onChange={(e) => setCompletionState((prev: any) => ({
                                ...prev,
                                padresTutores: {
                                  ...prev.padresTutores,
                                  papa: { ...prev.padresTutores.papa, tipoDocumento: e.target.value }
                                }
                              }))}
                              className="rounded-lg border border-slate-300 text-sm p-2.5 bg-white w-24"
                            >
                              <option value="DNI">DNI</option>
                              <option value="CE">C.E.</option>
                            </select>
                            <input 
                              type="text"
                              maxLength={12}
                              value={completionState?.padresTutores?.papa?.numeroDocumento || ''}
                              onChange={(e) => setCompletionState((prev: any) => ({
                                ...prev,
                                padresTutores: {
                                  ...prev.padresTutores,
                                  papa: { ...prev.padresTutores.papa, numeroDocumento: e.target.value }
                                }
                              }))}
                              placeholder="Número de doc"
                              className={`flex-1 rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                                compErrors.papa_numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                          </div>
                          {compErrors.papa_numeroDocumento && <p className="text-xs text-red-500 mt-1">{compErrors.papa_numeroDocumento}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Celular de Contacto <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            maxLength={9}
                            value={completionState?.padresTutores?.papa?.celularContacto || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                papa: { ...prev.padresTutores.papa, celularContacto: e.target.value }
                              }
                            }))}
                            placeholder="9XXXXXXXX"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.papa_celularContacto ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.papa_celularContacto && <p className="text-xs text-red-500 mt-1">{compErrors.papa_celularContacto}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Correo Electrónico <span className="text-red-500">*</span></label>
                          <input 
                            type="email"
                            value={completionState?.padresTutores?.papa?.correoElectronico || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                papa: { ...prev.padresTutores.papa, correoElectronico: e.target.value }
                              }
                            }))}
                            placeholder="ejemplo@correo.com"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.papa_correoElectronico ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.papa_correoElectronico && <p className="text-xs text-red-500 mt-1">{compErrors.papa_correoElectronico}</p>}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4 border-t">
                      <button 
                        onClick={() => {
                          setCompletionStep(1);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Atrás
                      </button>
                      <button 
                        onClick={() => {
                          const errs: any = {};
                          const papa = completionState?.padresTutores?.papa;
                          if (papa && !papa.fallecido) {
                            if (!papa.nombres?.trim()) errs.papa_nombres = "Nombres obligatorios.";
                            if (!papa.apellidoPaterno?.trim()) errs.papa_apellidoPaterno = "Apellido paterno obligatorio.";
                            if (!papa.apellidoMaterno?.trim()) errs.papa_apellidoMaterno = "Apellido materno obligatorio.";
                            if (!papa.numeroDocumento?.trim() || papa.numeroDocumento.length < 8) errs.papa_numeroDocumento = "DNI debe tener 8 dígitos.";
                            if (!papa.celularContacto?.trim() || papa.celularContacto.length < 9) errs.papa_celularContacto = "Celular debe tener 9 dígitos.";
                            if (!papa.correoElectronico?.trim() || !papa.correoElectronico.includes('@')) errs.papa_correoElectronico = "Ingrese un correo electrónico válido.";
                          }
                          if (Object.keys(errs).length > 0) {
                            setCompErrors(errs);
                            triggerToast("⚠️ Por favor complete correctamente los datos de papá.");
                          } else {
                            setCompErrors({});
                            setCompletionStep(3);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Siguiente (Datos de la Madre)
                      </button>
                    </div>
                  </div>
                )}

                {completionStep === 3 && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-pink-600" />
                        Paso 3: Datos Detallados de la Madre (Mamá)
                      </span>
                      <label className="flex items-center space-x-2 text-xs font-bold text-red-600 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={completionState?.padresTutores?.mama?.fallecido || false}
                          onChange={(e) => setCompletionState((prev: any) => ({
                            ...prev,
                            padresTutores: {
                              ...prev.padresTutores,
                              mama: { ...prev.padresTutores.mama, fallecido: e.target.checked }
                            }
                          }))}
                          className="w-4 h-4 text-red-600 rounded border-red-300"
                        />
                        <span>MARCAR COMO FALLECIDA</span>
                      </label>
                    </h4>

                    {completionState?.padresTutores?.mama?.fallecido ? (
                      <div className="p-5 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs">
                        Usted ha marcado a la Madre como Fallecida. Los campos correspondientes no serán requeridos para la ficha técnica escolar.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nombres de la Madre <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.mama?.nombres || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                mama: { ...prev.padresTutores.mama, nombres: e.target.value }
                              }
                            }))}
                            placeholder="Nombres"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.mama_nombres ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.mama_nombres && <p className="text-xs text-red-500 mt-1">{compErrors.mama_nombres}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Apellido Paterno <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.mama?.apellidoPaterno || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                mama: { ...prev.padresTutores.mama, apellidoPaterno: e.target.value }
                              }
                            }))}
                            placeholder="Apellido Paterno"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.mama_apellidoPaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.mama_apellidoPaterno && <p className="text-xs text-red-500 mt-1">{compErrors.mama_apellidoPaterno}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Apellido Materno <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={completionState?.padresTutores?.mama?.apellidoMaterno || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                mama: { ...prev.padresTutores.mama, apellidoMaterno: e.target.value }
                              }
                            }))}
                            placeholder="Apellido Materno"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.mama_apellidoMaterno ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.mama_apellidoMaterno && <p className="text-xs text-red-500 mt-1">{compErrors.mama_apellidoMaterno}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Documento Identidad <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <select 
                              value={completionState?.padresTutores?.mama?.tipoDocumento || 'DNI'}
                              onChange={(e) => setCompletionState((prev: any) => ({
                                ...prev,
                                padresTutores: {
                                  ...prev.padresTutores,
                                  mama: { ...prev.padresTutores.mama, tipoDocumento: e.target.value }
                                }
                              }))}
                              className="rounded-lg border border-slate-300 text-sm p-2.5 bg-white w-24"
                            >
                              <option value="DNI">DNI</option>
                              <option value="CE">C.E.</option>
                            </select>
                            <input 
                              type="text"
                              maxLength={12}
                              value={completionState?.padresTutores?.mama?.numeroDocumento || ''}
                              onChange={(e) => setCompletionState((prev: any) => ({
                                ...prev,
                                padresTutores: {
                                  ...prev.padresTutores,
                                  mama: { ...prev.padresTutores.mama, numeroDocumento: e.target.value }
                                }
                              }))}
                              placeholder="Número de doc"
                              className={`flex-1 rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                                compErrors.mama_numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                              }`}
                            />
                          </div>
                          {compErrors.mama_numeroDocumento && <p className="text-xs text-red-500 mt-1">{compErrors.mama_numeroDocumento}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Celular de Contacto <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            maxLength={9}
                            value={completionState?.padresTutores?.mama?.celularContacto || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                mama: { ...prev.padresTutores.mama, celularContacto: e.target.value }
                              }
                            }))}
                            placeholder="9XXXXXXXX"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.mama_celularContacto ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.mama_celularContacto && <p className="text-xs text-red-500 mt-1">{compErrors.mama_celularContacto}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Correo Electrónico <span className="text-red-500">*</span></label>
                          <input 
                            type="email"
                            value={completionState?.padresTutores?.mama?.correoElectronico || ''}
                            onChange={(e) => setCompletionState((prev: any) => ({
                              ...prev,
                              padresTutores: {
                                ...prev.padresTutores,
                                mama: { ...prev.padresTutores.mama, correoElectronico: e.target.value }
                              }
                            }))}
                            placeholder="ejemplo@correo.com"
                            className={`w-full rounded-lg border shadow-sm text-sm p-2.5 bg-white ${
                              compErrors.mama_correoElectronico ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                            }`}
                          />
                          {compErrors.mama_correoElectronico && <p className="text-xs text-red-500 mt-1">{compErrors.mama_correoElectronico}</p>}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4 border-t">
                      <button 
                        onClick={() => {
                          setCompletionStep(2);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Atrás
                      </button>
                      <button 
                        onClick={() => {
                          const errs: any = {};
                          const mama = completionState?.padresTutores?.mama;
                          if (mama && !mama.fallecido) {
                            if (!mama.nombres?.trim()) errs.mama_nombres = "Nombres obligatorios.";
                            if (!mama.apellidoPaterno?.trim()) errs.mama_apellidoPaterno = "Apellido paterno obligatorio.";
                            if (!mama.apellidoMaterno?.trim()) errs.mama_apellidoMaterno = "Apellido materno obligatorio.";
                            if (!mama.numeroDocumento?.trim() || mama.numeroDocumento.length < 8) errs.mama_numeroDocumento = "DNI debe tener 8 dígitos.";
                            if (!mama.celularContacto?.trim() || mama.celularContacto.length < 9) errs.mama_celularContacto = "Celular debe tener 9 dígitos.";
                            if (!mama.correoElectronico?.trim() || !mama.correoElectronico.includes('@')) errs.mama_correoElectronico = "Ingrese un correo electrónico válido.";
                          }
                          if (Object.keys(errs).length > 0) {
                            setCompErrors(errs);
                            triggerToast("⚠️ Por favor complete correctamente los datos de mamá.");
                          } else {
                            setCompErrors({});
                            setCompletionStep(4);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Siguiente (Confirmación)
                      </button>
                    </div>
                  </div>
                )}

                {completionStep === 4 && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Paso 4: Declaración Jurada y Guardado Oficial
                    </h4>
                    
                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 text-slate-800 space-y-3">
                      <p className="text-xs font-black text-amber-900 uppercase">¿Están correctos todos sus datos?</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Al confirmar el guardado, su ficha escolar de admisión pasará al estado de <strong>"Pendiente de Documentación"</strong>. El portal se desbloqueará completamente para que pueda cargar sus documentos y agendar la fecha de la cita psicopedagógica con total libertad.
                      </p>
                    </div>

                    <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3 shadow-xs">
                      <div className="flex items-center space-x-2 border-b border-blue-150 pb-2">
                        <ShieldCheck className="w-5 h-5 text-blue-700" />
                        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Declaración Jurada de Veracidad</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-950 leading-relaxed italic">
                        "Declaro bajo juramento que los nuevos datos consignados para completar mi ficha de admisión son completamente reales y veraces. Me hago plenamente responsable de cualquier inconsistencia o información fraudulenta, que anularía automáticamente la postulación de mi menor hijo(a)."
                      </p>
                      <div className="pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={declaroComp}
                            onChange={(e) => setDeclaroComp(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-bold text-blue-900">
                            Acepto y firmo la declaración jurada de datos completos.
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                      <button 
                        onClick={() => {
                          setCompletionStep(3);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-lg text-xs"
                      >
                        Atrás
                      </button>
                      <button 
                        onClick={() => {
                          if (!declaroComp) {
                            triggerToast("⚠️ Debe firmar la declaración jurada para continuar.");
                            return;
                          }

                          // Save and finalize form
                          const finalRecord = {
                            ...currentUser,
                            formState: completionState,
                            status: 'documents_pending' // Unlock stage
                          };
                          
                          saveRecord(finalRecord);
                          setCurrentUser(finalRecord);
                          setIsCompletingForm(false);
                          setCompletionStep(1);
                          triggerToast("🎉 ¡Felicidades! Su Ficha Técnica de Admisión ha sido completada y guardada exitosamente. Ahora puede proceder a la carga de documentos.");
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-lg text-xs shadow-md"
                      >
                        ✓ Guardar Ficha Completa y Desbloquear Portal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // INVITATION TO COMPLETE THE DETAILED FORM
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-8 rounded-3xl text-center space-y-6 max-w-2xl mx-auto my-6 shadow-sm">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <Sparkles className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] bg-green-100 text-green-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    ¡Pre-Inscripción Aprobada por Administrador! 🎉
                  </span>
                  <h3 className="text-xl font-black text-slate-900 uppercase">Ficha Técnica Pendiente de Datos Detallados</h3>
                  <p className="text-sm text-slate-600 leading-normal max-w-lg mx-auto">
                    Su solicitud rápida ha sido revisada y aceptada de forma preliminar por el Colegio <strong>Juventud Científica</strong>. Para continuar con los siguientes pasos del proceso de admisión, debe rellenar la información detallada que omitió al inicio.
                  </p>
                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        setIsCompletingForm(true);
                        setCompletionStep(1);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition duration-150 text-xs hover:scale-102 cursor-pointer"
                    >
                      ✏️ Rellenar Datos Detallados de Admisión Ahora
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase">Previsualización de su Ficha de Admisión</h3>
                <p className="text-xs text-slate-500">Asegúrese de que todos los datos registrados sean válidos e imprima su constancia oficial.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    downloadConstanciaPDF(currentUser.formState);
                    triggerToast("📥 Descargando Constancia en PDF...");
                  }}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-xl transition duration-150 flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl transition duration-150 flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Constancia</span>
                </button>
              </div>
            </div>

            {/* Micro summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estudiante Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-blue" />
                  Información del Postulante
                </h4>
                <div className="space-y-1 text-xs">
                  <p><span className="text-slate-400 font-semibold">Nombres:</span> <strong className="text-slate-700">{student.nombres}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Apellidos:</span> <strong className="text-slate-700">{student.apellidoPaterno} {student.apellidoMaterno}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Documento:</span> <strong className="text-slate-700">{student.tipoDocumento} - {student.numeroDocumento}</strong></p>
                  <p><span className="text-slate-400 font-semibold">F. Nacimiento:</span> <strong className="text-slate-700">{student.fechaNacimiento}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Lugar Proc:</span> <strong className="text-slate-700">{currentUser.formState.lugarAdicionales.departamento}, {currentUser.formState.lugarAdicionales.provincia}</strong></p>
                </div>
              </div>

              {/* Padres / Apoderado Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-brand-blue" />
                  Información Familiar
                </h4>
                <div className="space-y-1 text-xs">
                  <p><span className="text-slate-400 font-semibold">Apoderado:</span> <strong className="text-slate-700">{currentUser.formState.padresTutores.apoderado.nombres} {currentUser.formState.padresTutores.apoderado.apellidoPaterno}</strong></p>
                  <p><span className="text-slate-400 font-semibold">DNI Apoderado:</span> <strong className="text-slate-700">{currentUser.formState.padresTutores.apoderado.numeroDocumento}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Dirección Residencia:</span> <strong className="text-slate-700">{currentUser.formState.fichaFamilia?.direccionResidencia || 'Av. Las Palmas 320'}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Celular Familiar:</span> <strong className="text-slate-700">{currentUser.formState.fichaFamilia?.telefonoContacto || '999888777'}</strong></p>
                  <p><span className="text-slate-400 font-semibold">Correo Contacto:</span> <strong className="text-slate-700">{currentUser.formState.fichaFamilia?.correoContacto || 'familia@gmail.com'}</strong></p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-4 flex gap-3 text-xs text-amber-900 leading-normal">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Descarga de PDF habilitada:</strong> Para guardar este registro oficial como archivo PDF en su computadora o celular, haga clic en el botón <strong>"Imprimir Constancia PDF"</strong> de arriba y en el diálogo de impresión seleccione la opción <strong>"Guardar como PDF"</strong> o <strong>"Destino: Microsoft Print to PDF"</strong>.
              </div>
            </div>
          </div>
        ))}

        {activeSubTab === 'documentos' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Carga de Documentación Obligatoria</h3>
              <p className="text-xs text-slate-500">Suba los archivos escaneados o fotografías legibles para que la Comisión verifique su expediente.</p>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {docsList.map((doc) => {
                const isUploaded = !!currentUser.documents?.[doc.key];
                const fileName = currentUser.documents?.[doc.key];

                return (
                  <div key={doc.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${isUploaded ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                        {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">{doc.label}</span>
                        {isUploaded ? (
                          <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                            Cargado: {fileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold text-rose-600">
                            Falta cargar archivo (*)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                      {uploadingDoc === doc.key ? (
                        /* Uploading spinner */
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Subiendo ({uploadProgress}%)</span>
                        </div>
                      ) : isUploaded ? (
                        /* Delete file link */
                        <button
                          onClick={() => handleRemoveDoc(doc.key)}
                          className="text-[11px] text-red-600 hover:text-red-700 font-extrabold hover:underline"
                        >
                          Eliminar y volver a subir
                        </button>
                      ) : (
                        /* File Input trigger */
                        <label className="bg-white hover:bg-slate-100 text-brand-navy border border-slate-300 font-black py-1.5 px-4 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Seleccionar archivo</span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => handleSimulatedUpload(doc.key, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Check validation complete banner */}
            {isDocsComplete ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-3 text-xs text-green-900 font-bold">
                <Check className="w-5 h-5 text-green-600 shrink-0" />
                <span>¡Perfecto! Ha cargado la totalidad de los documentos requeridos de manera satisfactoria.</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-xs text-amber-900 leading-normal">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Documentación Incompleta:</strong> Asegúrese de cargar los 4 documentos listados arriba para poder habilitar el último paso de <strong>"Matrícula"</strong>.
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'cita' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Reserva de Cita Psicopedagógica</h3>
              <p className="text-xs text-slate-500">
                Seleccione una fecha y hora disponible para la entrevista psicológica oficial. Las citas se reservan en intervalos fijos de 1 hora.
              </p>
            </div>

            {/* Selected appointment display if booked */}
            {currentUser.appointment ? (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl text-white flex items-center justify-center shadow-md mt-0.5 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-xs bg-green-100 text-green-800 font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider">
                      Cita Confirmada
                    </span>
                    <h4 className="text-sm font-black text-slate-950 uppercase">
                      {currentUser.appointment.dateLabel}
                    </h4>
                    <p className="text-xs text-slate-700 font-bold flex items-center gap-1.5 mt-1">
                      <Clock className="w-4 h-4 text-brand-blue" />
                      <span>Horario reservado: {currentUser.appointment.timeSlot}</span>
                    </p>
                    <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                      <p>💻 <strong>Modalidad:</strong> Entrevista Psicopedagógica Virtual (Vía Zoom)</p>
                      <p>🔗 <strong>Enlace de Acceso:</strong> <a href="https://zoom.us/j/juventud-cientifica-adm-2027" target="_blank" rel="noreferrer" className="text-blue-700 underline hover:text-blue-800 font-bold">Unirse a la Reunión Zoom</a></p>
                      <p>👩‍⚕️ <strong>Psicóloga asignada:</strong> Lic. Ana Sofía Martínez (Colegiatura N° 4519-COP)</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCancelAppointment}
                  className="w-full md:w-auto bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2.5 px-4 rounded-xl border border-red-200 hover:border-red-300 transition duration-150 text-xs shadow-xs cursor-pointer"
                >
                  Cancelar / Reagendar Cita
                </button>
              </div>
            ) : (
              /* Selection scheduling portal */
              <div className="space-y-5">
                {/* 1. Date list tabs */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Seleccione una Fecha de Entrevista
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {datesList.map((d) => {
                      const isSelected = selectedDate === d.key;
                      return (
                        <button
                          key={d.key}
                          onClick={() => setSelectedDate(d.key)}
                          className={`py-2.5 px-4 rounded-xl border text-xs font-bold text-center shrink-0 transition cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-navy text-white border-brand-navy shadow-md hover:scale-101' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {d.label.split(',')[0]}
                          <span className="block text-[10px] opacity-75 font-mono mt-0.5">
                            {d.label.split(',')[1] || d.key.slice(5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Hour slots selection */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Seleccione un Horario Disponible
                    </label>
                    <span className="text-[10px] text-slate-500 font-bold">Intervalos de 1 Hora</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {timeSlots.map((slot) => {
                      const isOccupied = (occupiedSlots[selectedDate] || []).includes(slot);
                      
                      return (
                        <button
                          key={slot}
                          disabled={isOccupied}
                          onClick={() => handleBookAppointment(slot)}
                          className={`p-3.5 rounded-2xl border text-left transition flex justify-between items-center ${
                            isOccupied
                              ? 'bg-rose-50/50 text-rose-400 border-rose-100 cursor-not-allowed'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-brand-blue cursor-pointer hover:shadow-xs hover:scale-101'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${isOccupied ? 'text-rose-300' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">{slot}</span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isOccupied ? 'bg-rose-100 text-rose-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {isOccupied ? 'Ocupado' : 'Disponible'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded-2xl text-[11px] leading-normal flex gap-2">
                  <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Intervalo de Citas:</strong> Las entrevistas psicopedagógicas se coordinan para un solo postulante por hora a fin de garantizar un diagnóstico preciso. Si un horario figura como ocupado, por favor seleccione otra hora u otro día del calendario de admisiones.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'matricula' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Confirmación de Matrícula & Aula Asignada</h3>
              <p className="text-xs text-slate-500">Último paso del proceso de admisión. Inscriba formalmente al alumno y reciba su asignación de aula.</p>
            </div>

            {/* Flow rendering depending on completeness */}
            {!isDocsComplete || !isApptBooked ? (
              /* Warn: Requirements pending */
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase">Requisitos Pendientes de Aprobación</h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Para poder realizar la matrícula oficial, el sistema requiere que complete previamente las etapas anteriores de carga de documentación y agendamiento de entrevista.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold">
                  <div className={`p-3 rounded-2xl border ${isDocsComplete ? 'bg-green-50 text-green-800 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    <span>1. Documentos</span>
                    <span className="block text-[10px] font-extrabold mt-0.5 uppercase tracking-wide">
                      {isDocsComplete ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${isApptBooked ? 'bg-green-50 text-green-800 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    <span>2. Cita Psicológica</span>
                    <span className="block text-[10px] font-extrabold mt-0.5 uppercase tracking-wide">
                      {isApptBooked ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
            ) : isMatriculado ? (
              /* Matriculado Success */
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-2xl text-white flex items-center justify-center shadow-lg mt-0.5 shrink-0">
                      <CheckCircle2 className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs bg-green-100 text-green-800 font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider">
                        Matrícula Completada N° JC-2027
                      </span>
                      <h4 className="text-base font-black text-slate-950 uppercase">
                        ¡El estudiante ya se encuentra matriculado!
                      </h4>
                      <p className="text-xs text-slate-700 leading-normal">
                        Felicidades, se ha finalizado el registro formal para el período lectivo 2027. La vacante está plenamente asegurada.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Classroom Card */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border-b-4 border-amber-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 to-indigo-900/40"></div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-3">
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                        Aula Asignada Oficial
                      </span>
                      <h4 className="text-lg font-black uppercase tracking-tight leading-tight">
                        {currentUser.assignedClassroom || getClassroomByGrade(grade)}
                      </h4>
                      <div className="space-y-1 text-xs text-slate-300">
                        <p>🏫 <strong>Pabellón correspondiente:</strong> Pabellón de {level} - Año Escolar 2027</p>
                        <p>📍 <strong>Sede:</strong> {sede || 'Principal - Juventud Científica'}</p>
                        <p>📋 <strong>Código de Aula:</strong> JC-A-{currentUser.id.split('-')[1] || '101'}</p>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl space-y-2 border border-white/15 text-xs">
                      <h5 className="font-extrabold uppercase text-amber-400">Próximos Pasos de Ingreso:</h5>
                      <ul className="list-disc list-inside space-y-1 text-slate-200">
                        <li>La reunión de inducción familiar será el <strong>02 de Marzo, 2027</strong>.</li>
                        <li>El inicio oficial de clases está agendado para el <strong>08 de Marzo, 2027</strong>.</li>
                        <li>La entrega de la lista de útiles se enviará a su correo electrónico de contacto.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Ready to matriculate */
              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-200/80 text-center space-y-5 max-w-xl mx-auto">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    Vacante Aprobada por Admisión
                  </span>
                  <h4 className="text-base font-black text-slate-900 uppercase">¡Ficha y Requisitos Validados!</h4>
                  <p className="text-xs text-slate-600 leading-normal">
                    La Comisión de Admisión del Colegio <strong>Juventud Científica</strong> ha validado con éxito sus 4 documentos y la programación de su cita de entrevista psicológica. Haga clic en el botón de abajo para confirmar la matrícula del estudiante.
                  </p>
                </div>

                <button
                  onClick={handleConfirmMatricula}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition duration-150 flex items-center justify-center gap-2 text-xs hover:scale-101 cursor-pointer"
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                  Confirmar Matrícula y Asignar Aula
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
