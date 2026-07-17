import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  CreditCard, 
  FileCheck2, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Check, 
  AlertCircle, 
  X,
  Sparkles,
  Award,
  School,
  FileText,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { AdmissionRecord } from '../utils/seedData';

interface ApplicantDossierModalProps {
  selectedApplicant: AdmissionRecord | null;
  setSelectedApplicant: (applicant: AdmissionRecord | null) => void;
  currentUser: any;
  onSaveRecord: (record: AdmissionRecord) => void;
  getStatusLabel: (status: string) => { text: string; bg: string };
  renderDecisionPanel: (
    stageKey: 'documents' | 'payment' | 'appointment' | 'academic' | 'final',
    currentStatus: 'approved' | 'observed' | 'rejected' | 'pending' | undefined,
    observation: string | undefined,
    rejectedReason: string | undefined,
    reviewedBy: string | undefined,
    reviewedAt: string | undefined,
    onApprove: () => void,
    onObserve: (reason: string) => void,
    onReject: (reason: string) => void,
    stageLabel: string
  ) => React.ReactNode;
  requiresGoodConduct: (gradeName: string) => boolean;
  handleSaveStatusChange: () => void;
  isChangingStatus: boolean;
  setIsChangingStatus: (val: boolean) => void;
  tempStatus: string;
  setTempStatus: (val: string) => void;
  triggerToast: (msg: string) => void;
}

interface DniDocument {
  frontal: string | null;
  posterior: string | null;
}

function parseDniValue(val: string | null): DniDocument {
  if (!val) {
    return { frontal: null, posterior: null };
  }
  if (val.startsWith('{')) {
    try {
      const parsed = JSON.parse(val);
      return {
        frontal: parsed.frontal || null,
        posterior: parsed.posterior || null
      };
    } catch (e) {
      // fallback
    }
  }
  return {
    frontal: val,
    posterior: val
  };
}

export default function ApplicantDossierModal({
  selectedApplicant,
  setSelectedApplicant,
  currentUser,
  onSaveRecord,
  getStatusLabel,
  renderDecisionPanel,
  requiresGoodConduct,
  handleSaveStatusChange,
  isChangingStatus,
  setIsChangingStatus,
  tempStatus,
  setTempStatus,
  triggerToast
}: ApplicantDossierModalProps) {
  
  const [activeApplicantTab, setActiveApplicantTab] = useState<string>('general');
  const [expandedDoc, setExpandedDoc] = useState<string | null>('dniPostulante');
  const [activeFamilyTab, setActiveFamilyTab] = useState<'apoderado' | 'mama' | 'papa' | 'ficha'>('apoderado');

  if (!selectedApplicant) return null;

  // Compute timeline events dynamically based on the record state
  const getTimelineEvents = (applicant: AdmissionRecord) => {
    const events: { date: string; title: string; user: string; description: string; type: 'success' | 'warning' | 'info' | 'danger' }[] = [];
    
    // 1. Creation
    events.push({
      date: applicant.createdAt || 'Fecha de registro',
      title: 'Pre-Inscripción Iniciada',
      user: 'Postulante/Apoderado',
      description: `Se registró el expediente de postulación en línea para ${applicant.formState.personales.nombres} ${applicant.formState.personales.apellidoPaterno}.`,
      type: 'info'
    });
    
    // 2. Ficha completed
    if (applicant.fichaCompletedAt) {
      events.push({
        date: applicant.fichaCompletedAt,
        title: 'Ficha de Datos Completada',
        user: 'Apoderado',
        description: `Se completaron los datos personales, familiares e información de salud. Código de familia asignado: ${applicant.formState.fichaFamilia?.codigoFamilia || 'N/A'}.`,
        type: 'success'
      });
    }

    // 3. Documentos Carga
    if (applicant.documents?.dniPostulante || applicant.documents?.dniApoderado) {
      events.push({
        date: applicant.fichaCompletedAt || applicant.createdAt,
        title: 'Carga de Documentación Obligatoria',
        user: 'Apoderado',
        description: 'Se subieron los documentos requeridos (DNI del postulante, DNI del apoderado, Recibo de Servicio).',
        type: 'info'
      });
    }

    // 3b. Documentos Validación
    if (applicant.documentsReviewedAt && applicant.documentsStatus) {
      events.push({
        date: applicant.documentsReviewedAt,
        title: applicant.documentsStatus === 'approved' ? 'Documentación Verificada' : applicant.documentsStatus === 'observed' ? 'Documentación con Observaciones' : 'Documentación Rechazada',
        user: applicant.documentsReviewedBy || 'Administrador',
        description: applicant.documentsStatus === 'approved'
          ? 'Todos los documentos obligatorios fueron revisados y validados con éxito.'
          : `Documentos observados/rechazados: "${applicant.documentsObservation || applicant.documentsRejectedReason}"`,
        type: applicant.documentsStatus === 'approved' ? 'success' : applicant.documentsStatus === 'observed' ? 'warning' : 'danger'
      });
    }

    // 4. Pago Carga
    if (applicant.paymentComprobante) {
      events.push({
        date: applicant.paymentDate || applicant.createdAt,
        title: 'Comprobante de Pago Subido',
        user: 'Apoderado',
        description: `Se registró el pago por Derecho de Admisión. Monto: S/. ${applicant.paymentAmount || '350.00'}. Código de operación: ${applicant.paymentCode || 'N/A'}.`,
        type: 'info'
      });
    }

    // 4b. Pago Validación
    if (applicant.paymentReviewedAt && applicant.paymentState) {
      events.push({
        date: applicant.paymentReviewedAt,
        title: applicant.paymentState === 'paid' ? 'Pago Validado con Éxito' : applicant.paymentState === 'observed' ? 'Pago con Observaciones' : 'Pago Rechazado',
        user: applicant.paymentReviewedBy || 'Administrador',
        description: applicant.paymentState === 'paid'
          ? 'El pago por Derecho de Admisión fue confirmado por tesorería.'
          : `Comentarios de pago: "${applicant.paymentObservation || applicant.paymentRejectedReason}"`,
        type: applicant.paymentState === 'paid' ? 'success' : applicant.paymentState === 'observed' ? 'warning' : 'danger'
      });
    }

    // 5. Cita Psicopedagógica Programada
    if (applicant.appointment) {
      events.push({
        date: applicant.appointment.date || applicant.createdAt,
        title: 'Cita Psicopedagógica Programada',
        user: 'Psicopedagogía',
        description: `Cita programada para el día ${applicant.appointment.dateLabel || applicant.appointment.date} a las ${applicant.appointment.timeSlot || applicant.appointment.time}. Especialista asignado: ${applicant.appointment.psychologist || 'Por designar'}.`,
        type: 'info'
      });
    }

    // 5b. Cita Psicopedagógica Revisión
    if (applicant.appointmentReviewedAt && applicant.appointmentStatus) {
      events.push({
        date: applicant.appointmentReviewedAt,
        title: applicant.appointmentStatus === 'approved' ? 'Evaluación Psicopedagógica Aprobada' : applicant.appointmentStatus === 'observed' ? 'Cita Psicopedagógica Observada' : 'Cita Psicopedagógica Rechazada',
        user: applicant.appointmentReviewedBy || 'Administrador',
        description: applicant.appointmentStatus === 'approved'
          ? 'Evaluación psicológica completada satisfactoriamente.'
          : `Observaciones: "${applicant.appointmentObservation || applicant.appointmentRejectedReason}"`,
        type: applicant.appointmentStatus === 'approved' ? 'success' : applicant.appointmentStatus === 'observed' ? 'warning' : 'danger'
      });
    }

    // 6. Evaluación Académica
    if (applicant.academicEvaluationReviewedAt && applicant.academicEvaluationStatus) {
      events.push({
        date: applicant.academicEvaluationReviewedAt,
        title: applicant.academicEvaluationStatus === 'approved' ? 'Evaluación Académica Aprobada' : applicant.academicEvaluationStatus === 'observed' ? 'Evaluación Académica Observada' : 'Evaluación Académica Rechazada',
        user: applicant.academicEvaluationReviewedBy || 'Administrador',
        description: applicant.academicEvaluationStatus === 'approved'
          ? 'Examen académico rendido y aprobado.'
          : `Observaciones de examen: "${applicant.academicEvaluationObservation || applicant.academicEvaluationRejectedReason}"`,
        type: applicant.academicEvaluationStatus === 'approved' ? 'success' : applicant.academicEvaluationStatus === 'observed' ? 'warning' : 'danger'
      });
    }

    // 7. Final Admisión
    if (applicant.finalStatusReviewedAt && applicant.finalStatus) {
      events.push({
        date: applicant.finalStatusReviewedAt,
        title: applicant.finalStatus === 'approved' ? 'Admisión Aprobada (Admitido)' : applicant.finalStatus === 'observed' ? 'Admisión Observada' : 'Admisión Rechazada',
        user: applicant.finalStatusReviewedBy || 'Administrador',
        description: applicant.finalStatus === 'approved'
          ? 'El postulante fue declarado APTO y admitido formalmente en el año escolar.'
          : `Decisión final observaciones: "${applicant.finalStatusObservation || applicant.finalStatusRejectedReason}"`,
        type: applicant.finalStatus === 'approved' ? 'success' : applicant.finalStatus === 'observed' ? 'warning' : 'danger'
      });
    }

    // 8. Matrícula
    if (applicant.status === 'enrolled') {
      events.push({
        date: applicant.finalStatusReviewedAt || applicant.createdAt,
        title: 'Matrícula Completada con Éxito',
        user: 'Secretaría Académica',
        description: `Se completó la firma de contrato de matrícula. Aula asignada: ${applicant.assignedClassroom || 'Aula Pendiente'}.`,
        type: 'success'
      });
    }

    return events;
  };

  const timelineEvents = getTimelineEvents(selectedApplicant);

  const tabsList = [
    { id: 'general', label: 'Información General', icon: AlertCircle },
    { id: 'postulante', label: 'Ficha del Postulante', icon: UserCheck },
    { id: 'apoderado', label: 'Apoderado / Familia', icon: Users },
    { id: 'documentos', label: 'Documentos', icon: FileCheck2 },
    { id: 'pago', label: 'Derecho de Admisión', icon: CreditCard },
    { id: 'cita', label: 'Cita Psicopedagógica', icon: Calendar },
    { id: 'evaluacion', label: 'Evaluación Académica', icon: Award },
    { id: 'observaciones', label: 'Observaciones', icon: ShieldAlert },
    { id: 'historial', label: 'Historial', icon: Clock },
    { id: 'proceso', label: 'Estado del Proceso', icon: TrendingUp }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] md:h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
      >
        {/* Fixed Modal Header */}
        <div className="bg-slate-900 text-white p-5 border-b-4 border-amber-500 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  EXPEDIENTE: {selectedApplicant.id}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2 py-0.5 rounded border border-slate-700 font-mono">
                  FAMILIA: {selectedApplicant.formState.fichaFamilia?.codigoFamilia || 'N/A'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2 py-0.5 rounded border border-slate-700 font-mono">
                  AÑO: {selectedApplicant.formState.postulacion.anoProceso || '2027'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white mt-1">
                {selectedApplicant.formState.personales.apellidoPaterno} {selectedApplicant.formState.personales.apellidoMaterno}, {selectedApplicant.formState.personales.nombres}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Grado: <strong className="text-white uppercase">{selectedApplicant.formState.postulacion.gradoIngreso}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  Sede: <strong className="text-white uppercase">{selectedApplicant.formState.postulacion.sedeLocal}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${getStatusLabel(selectedApplicant.status).bg}`}>
                    {getStatusLabel(selectedApplicant.status).text}
                  </span>
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedApplicant(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
              title="Cerrar expediente"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Tabs Bar (Fixed) */}
        <div className="bg-slate-50 border-b border-slate-200 shrink-0 flex overflow-x-auto whitespace-nowrap gap-1 p-2 scrollbar-thin scrollbar-thumb-slate-300">
          {tabsList.map(tab => {
            const Icon = tab.icon;
            const isActive = activeApplicantTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveApplicantTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Inner Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-100/30">
          
          {/* TAB CONTENT: INFORMACIÓN GENERAL */}
          {activeApplicantTab === 'general' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Códigos y Registro */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    Códigos y Registro
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Código de Ficha (Expediente)</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 font-mono">{selectedApplicant.id}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Código de Familia</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 font-mono">{selectedApplicant.formState.fichaFamilia?.codigoFamilia || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Código de Postulante</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 font-mono">
                        {selectedApplicant.formState.postulacion.tipoAlumno === 'antiguo' ? selectedApplicant.formState.postulacion.codigoAntiguo : 'N/A (Alumno Nuevo)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Año de Proceso</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedApplicant.formState.postulacion.anoProceso || '2027'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fecha de Registro</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedApplicant.createdAt || 'No registrada'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Detalles de la Postulación */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                    <Award className="w-4 h-4 text-indigo-500" />
                    Detalles de Postulación
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nivel Educativo</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.nivelEducativo}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Grado Solicitado</span>
                      <span className="font-extrabold text-indigo-700 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.gradoIngreso}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Sede de Postulación</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.sedeLocal}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Distrito de Postulación</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.distritoPostulacion}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Turno de Preferencia</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.turnoPreferencia}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Infraestructura / Sede y Aula */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                    <School className="w-4 h-4 text-emerald-500" />
                    Infraestructura y Aula
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Sede Escolar Asignada</span>
                      <span className="font-extrabold text-slate-800 text-xs block mt-0.5 uppercase">{selectedApplicant.formState.postulacion.sedeLocal}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Salón / Aula de Clases</span>
                      {selectedApplicant.status === 'enrolled' ? (
                        <div className="mt-1 bg-emerald-50 text-emerald-800 font-extrabold p-2 rounded-lg border border-emerald-200/80 text-xs flex items-center gap-1.5">
                          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>{selectedApplicant.assignedClassroom || 'Aula Asignada Exitosamente'}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px] mt-1 leading-normal">
                          Se habilitará y asignará de forma automática al completar la etapa final de matrícula con su respectiva vacante.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB CONTENT: FICHA DEL POSTULANTE */}
          {activeApplicantTab === 'postulante' && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* 1. Datos Personales */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  Datos Personales del Postulante
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nombres</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.nombres}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Paterno</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.apellidoPaterno}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Materno</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.apellidoMaterno}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Documento de Identidad</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.personales.tipoDocumento}: {selectedApplicant.formState.personales.numeroDocumento}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Género</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.genero}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fecha de Nacimiento</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.personales.fechaNacimiento}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Celular del Postulante</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.personales.celularContacto || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Colegio de Procedencia</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.colegioProcedencia || 'Ninguno'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Tipo de Colegio</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.tipoColegioProcedencia || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Grado / Nivel de Procedencia</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.personales.nivelGradoProcedencia || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">País de Nacimiento</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.paisNacimiento || 'Perú'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Lugar de Nacimiento</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">
                      {selectedApplicant.formState.lugarAdicionales?.lugarNacimiento || 'Lima'} ({selectedApplicant.formState.lugarAdicionales?.departamento || 'Lima'} - {selectedApplicant.formState.lugarAdicionales?.provincia || 'Lima'} - {selectedApplicant.formState.lugarAdicionales?.distrito || 'Lima'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vive Con</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.viveCon || 'Padres'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Responsable de Matrícula</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.responsableMatricula || 'No especificado'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Salud e Información Médica */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ficha de Salud y Condiciones Especiales
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Cuenta con Seguro?</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.cuentaSeguro || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Aseguradora</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.aseguradora || 'Ninguna'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Grupo Sanguíneo</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{(selectedApplicant.formState.lugarAdicionales as any)?.grupoSanguineo || 'No especificado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Alergias Conocidas</span>
                    <span className="font-extrabold text-rose-700 block mt-0.5 uppercase">{(selectedApplicant.formState.lugarAdicionales as any)?.alergias || 'Ninguna registrada'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Condición Física / Limitación</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{(selectedApplicant.formState.lugarAdicionales as any)?.discapacidadFisica || 'Ninguna'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Antecedente Psicológico o Necesidad Educativa Especial</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{(selectedApplicant.formState.lugarAdicionales as any)?.necesidadesEspeciales || 'Ninguno'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Religión y Sacramentos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Religión y Sacramentos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Religión</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.religion || 'Católica'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Parroquia / Iglesia</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.iglesiaParroquia || 'Ninguna'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Bautizado?</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.bautizado ? 'SÍ' : 'NO'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Primera Comunión</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.lugarAdicionales?.primeraComunion ? 'SÍ' : 'NO'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: APODERADO / FAMILIA */}
          {activeApplicantTab === 'apoderado' && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* Nested Compact Sub-Tabs */}
              <div className="flex gap-1 border-b border-slate-200 pb-1 shrink-0">
                {[
                  { id: 'apoderado', label: 'Apoderado Legal' },
                  { id: 'mama', label: 'Datos de la Madre' },
                  { id: 'papa', label: 'Datos del Padre' },
                  { id: 'ficha', label: 'Ficha Familiar' }
                ].map(subTab => {
                  const isSubActive = activeFamilyTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => setActiveFamilyTab(subTab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-tight transition cursor-pointer ${
                        isSubActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  );
                })}
              </div>

              {/* Nested Sub-Tab Content: APODERADO */}
              {activeFamilyTab === 'apoderado' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs animate-fade-in">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Datos del Apoderado Legal</h4>
                  {selectedApplicant.formState.padresTutores?.apoderado ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Relación / Parentesco</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{(selectedApplicant.formState.padresTutores.apoderado as any).parentesco || 'Padre'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nombres Completos</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.nombres}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Paterno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.apellidoPaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Materno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.apellidoMaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Documento de Identidad</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.tipoDocumento}: {selectedApplicant.formState.padresTutores.apoderado.numeroDocumento}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Celular</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.celularContacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Correo Electrónico</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 break-all">{selectedApplicant.formState.padresTutores.apoderado.correoElectronico}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Dirección de Domicilio</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.direccionDomicilio || 'La misma de la familia'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Profesión / Ocupación</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.profesionOcupacion || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Centro de Trabajo</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.apoderado.centroTrabajo || 'No registrado'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No se registraron datos independientes de apoderado. El padre o la madre asume la representación legal.</p>
                  )}
                </div>
              )}

              {/* Nested Sub-Tab Content: MADRE */}
              {activeFamilyTab === 'mama' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs animate-fade-in">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Datos de la Madre</h4>
                  {selectedApplicant.formState.padresTutores?.mama ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Fallecida?</span>
                        <span className="font-extrabold text-rose-700 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.fallecido ? 'SÍ (FINADA)' : 'NO'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nombres</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.nombres}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Paterno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.apellidoPaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Materno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.apellidoMaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Documento de Identidad</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.mama.tipoDocumento}: {selectedApplicant.formState.padresTutores.mama.numeroDocumento}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Celular</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.mama.celularContacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Correo Electrónico</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 break-all">{selectedApplicant.formState.padresTutores.mama.correoElectronico}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Grado Instrucción</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.gradoInstruccion || 'Superior'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Profesión / Ocupación</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.profesionOcupacion || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Centro de Trabajo</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.mama.centroTrabajo || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Ingresos Mensuales</span>
                        <span className="font-extrabold text-green-700 block mt-0.5 font-mono">{selectedApplicant.formState.padresTutores.mama.ingresosMensuales || 'S/. 0.00'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No se registraron datos de la madre.</p>
                  )}
                </div>
              )}

              {/* Nested Sub-Tab Content: PADRE */}
              {activeFamilyTab === 'papa' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs animate-fade-in">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Datos del Padre</h4>
                  {selectedApplicant.formState.padresTutores?.papa ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Fallecido?</span>
                        <span className="font-extrabold text-rose-700 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.fallecido ? 'SÍ (FINADO)' : 'NO'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nombres</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.nombres}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Paterno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.apellidoPaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Apellido Materno</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.apellidoMaterno}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Documento de Identidad</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.papa.tipoDocumento}: {selectedApplicant.formState.padresTutores.papa.numeroDocumento}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Celular</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.padresTutores.papa.celularContacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Correo Electrónico</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 break-all">{selectedApplicant.formState.padresTutores.papa.correoElectronico}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Grado Instrucción</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.gradoInstruccion || 'Superior'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Profesión / Ocupación</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.profesionOcupacion || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Centro de Trabajo</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.padresTutores.papa.centroTrabajo || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Ingresos Mensuales</span>
                        <span className="font-extrabold text-green-700 block mt-0.5 font-mono">{selectedApplicant.formState.padresTutores.papa.ingresosMensuales || 'S/. 0.00'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No se registraron datos del padre.</p>
                  )}
                </div>
              )}

              {/* Nested Sub-Tab Content: FICHA FAMILIAR */}
              {activeFamilyTab === 'ficha' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs animate-fade-in">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Ficha de Información Familiar</h4>
                  {selectedApplicant.formState.fichaFamilia ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Código Familiar</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 font-mono">{selectedApplicant.formState.fichaFamilia.codigoFamilia}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nombre de la Familia</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.nombreFamilia}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Estado Civil de Padres</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.estadoCivilPadres}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Teléfono de Contacto</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.formState.fichaFamilia.telefonoContacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Correo Principal de Contacto</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 break-all">{selectedApplicant.formState.fichaFamilia.correoContacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Dirección de Residencia</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.direccionResidencia}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Urbanización o Zona</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.urbanizacionZona}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Distrito</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.distrito}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Cómo se enteró de nosotros?</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 uppercase">{selectedApplicant.formState.fichaFamilia.comoEntero || 'Internet'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">¿Por qué desea ingresar al plantel?</span>
                        <p className="font-extrabold text-slate-700 block mt-0.5 bg-slate-50 p-2.5 rounded-lg border leading-relaxed text-[11px] font-serif">
                          "{selectedApplicant.formState.fichaFamilia.porQueDeseaIngresar || 'Por el alto nivel académico y los valores.'}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No se cargó ficha de familia.</p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB CONTENT: DOCUMENTOS */}
          {activeApplicantTab === 'documentos' && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-blue-800 text-[11px] leading-relaxed mb-1">
                👉 <strong>Revisión de Documentación:</strong> Revise cada una de las secciones colapsables a continuación para validar el DNI del alumno, DNI del apoderado legal, y los comprobantes anexos. Al finalizar, use el panel administrativo inferior para aprobar, observar o rechazar esta etapa.
              </div>

              {/* Collapsible Accordions for each Document */}
              <div className="space-y-3">
                {(() => {
                  const isPrivateSchool = selectedApplicant.formState.personales.tipoColegioProcedencia === 'Colegio Particular';
                  const isConductReq = requiresGoodConduct(selectedApplicant.formState.postulacion.gradoIngreso);

                  const docsConfig = [
                    { key: 'dniPostulante', label: '1. DNI del Postulante (Ambas Caras)', required: true },
                    { key: 'dniApoderado', label: '2. DNI del Apoderado (Ambas Caras)', required: true },
                    { key: 'reciboServicio', label: '3. Recibo de Servicio de Domicilio (Agua/Luz)', required: true },
                    ...(isPrivateSchool ? [{ key: 'constanciaNoAdeudo', label: '4. Constancia de No Adeudo de Colegio', required: true }] : []),
                    ...(isConductReq ? [{ key: 'cartaBuenaConducta', label: '5. Carta de Buena Conducta', required: true }] : [])
                  ];

                  return docsConfig.map(doc => {
                    const isDni = doc.key === 'dniPostulante' || doc.key === 'dniApoderado';
                    const rawVal = doc.key === 'reciboServicio' 
                      ? (selectedApplicant.documents?.['reciboServicio'] || (selectedApplicant.documents?.['dniPostulante'] ? 'recibo_servicio_domicilio.pdf' : null))
                      : (doc.key === 'cartaBuenaConducta'
                        ? (selectedApplicant.documents?.['cartaBuenaConducta'] || (selectedApplicant.documents?.['dniPostulante'] ? 'carta_buena_conducta_sello.pdf' : null))
                        : selectedApplicant.documents?.[doc.key as any]);
                    
                    let isUploaded = false;
                    let fileLabel = '';

                    if (isDni) {
                      const parsed = parseDniValue(rawVal);
                      isUploaded = !!parsed.frontal && !!parsed.posterior;
                      if (isUploaded) {
                        fileLabel = 'Completo (Ambas caras)';
                      } else if (parsed.frontal || parsed.posterior) {
                        fileLabel = 'Incompleto (Falta una cara)';
                      }
                    } else {
                      isUploaded = !!rawVal;
                      fileLabel = rawVal || '';
                    }

                    // Render accordion item
                    const isExpanded = expandedDoc === doc.key;
                    return (
                      <div key={doc.key} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => setExpandedDoc(isExpanded ? null : doc.key)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUploaded ? 'bg-green-500 shadow-xs' : 'bg-amber-500 shadow-xs'}`} />
                            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-tight">{doc.label}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isUploaded ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {isUploaded ? '✓ CARGADO' : '⏳ PENDIENTE'}
                            </span>
                          </div>
                          <span className="text-slate-400 text-xs font-bold font-mono">
                            {isExpanded ? '▲ Colapsar' : '▼ Expandir'}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-white space-y-4 animate-fade-in text-xs">
                            {isDni ? (
                              // Render beautiful visual DNI front & back
                              (() => {
                                const parsed = parseDniValue(rawVal);
                                const isPostulante = doc.key === 'dniPostulante';
                                
                                const nameStr = isPostulante 
                                  ? (selectedApplicant.formState?.personales?.nombres || 'Postulante')
                                  : (selectedApplicant.formState?.padresTutores?.apoderado?.nombres || 'Apoderado');
                                
                                const lastNameStr = isPostulante
                                  ? `${selectedApplicant.formState?.personales?.apellidoPaterno || ''} ${selectedApplicant.formState?.personales?.apellidoMaterno || ''}`.trim()
                                  : `${selectedApplicant.formState?.padresTutores?.apoderado?.apellidoPaterno || ''} ${selectedApplicant.formState?.padresTutores?.apoderado?.apellidoMaterno || ''}`.trim();

                                const docNumStr = isPostulante
                                  ? (selectedApplicant.formState?.personales?.numeroDocumento || '00000000')
                                  : (selectedApplicant.formState?.padresTutores?.apoderado?.numeroDocumento || '00000000');

                                const birthDateStr = isPostulante
                                  ? (selectedApplicant.formState?.personales?.fechaNacimiento || 'DD/MM/AAAA')
                                  : (selectedApplicant.formState?.padresTutores?.apoderado?.fechaNacimiento || 'DD/MM/AAAA');

                                return (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      
                                      {/* Frontal Face card */}
                                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[150px] relative overflow-hidden">
                                        {parsed.frontal ? (
                                          <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                              <div className="w-8 h-9 bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center text-[8px] font-bold text-indigo-700 shrink-0 shadow-xs font-mono">FOTO</div>
                                              <div className="text-right">
                                                <span className="text-[8px] font-black text-blue-600 block leading-tight font-mono">REPÚBLICA DEL PERÚ</span>
                                                <span className="text-[7px] text-slate-400 block leading-none font-mono">REGISTRO DE IDENTIDAD</span>
                                              </div>
                                            </div>
                                            <div className="text-[9px] space-y-0.5 mt-2.5 font-mono">
                                              <p className="truncate"><span className="text-slate-400">Apellidos:</span> <strong className="text-slate-700 uppercase">{lastNameStr || 'Demo'}</strong></p>
                                              <p className="truncate"><span className="text-slate-400">Nombres:</span> <strong className="text-slate-700 uppercase">{nameStr || 'Demo'}</strong></p>
                                              <p className="truncate"><span className="text-slate-400">Nº Doc:</span> <strong className="text-blue-700 font-extrabold">{docNumStr}</strong></p>
                                            </div>
                                            <span className="text-[8px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded mt-3 text-center block truncate border border-green-200">
                                              ✓ CARA FRONTAL VALIDADA
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                            <AlertCircle className="w-7 h-7 text-amber-500 mb-1.5" />
                                            <span className="text-[10px] text-slate-500 font-black leading-tight">CARA FRONTAL NO CARGADA</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Posterior Face card */}
                                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[150px] relative overflow-hidden">
                                        {parsed.posterior ? (
                                          <div className="flex-1 flex flex-col justify-between">
                                            <div className="w-full h-3 bg-slate-400 rounded-sm mb-1.5"></div>
                                            <div className="text-[9px] space-y-0.5 font-mono mt-1">
                                              <p className="truncate"><span className="text-slate-400">F. Nacimiento:</span> <strong className="text-slate-700">{birthDateStr}</strong></p>
                                              <p className="truncate"><span className="text-slate-400">Sexo:</span> <strong className="text-slate-700 uppercase">{isPostulante ? (selectedApplicant.formState?.personales?.genero || 'MASCULINO') : 'M/F'}</strong></p>
                                            </div>
                                            <div className="border border-dashed border-slate-300 p-1 rounded-md bg-white text-center mt-3">
                                              <span className="text-[7px] text-slate-400 block tracking-widest font-mono">|||||| |||| || ||||||| ||||</span>
                                            </div>
                                            <span className="text-[8px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded mt-3 text-center block truncate border border-indigo-200">
                                              ✓ CARA POSTERIOR VALIDADA
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                            <AlertCircle className="w-7 h-7 text-amber-500 mb-1.5" />
                                            <span className="text-[10px] text-slate-500 font-black leading-tight">CARA POSTERIOR NO CARGADA</span>
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              // Render document download or detail panel
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                                  <div>
                                    <p className="font-extrabold text-slate-700 text-xs">{fileLabel || 'Nombre del Archivo'}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Formato: PDF / Documento Digital</p>
                                  </div>
                                </div>
                                {isUploaded && (
                                  <a
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      triggerToast(`📥 Descargando archivo: ${fileLabel}`);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] transition cursor-pointer animate-fade-in"
                                  >
                                    Descargar Archivo
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

                  {/* Decison Panel for Documents Stage */}
                  <div className="pt-2">
                    {renderDecisionPanel(
                      'documents',
                      selectedApplicant.documentsStatus,
                      selectedApplicant.documentsObservation,
                      selectedApplicant.documentsRejectedReason,
                      selectedApplicant.documentsReviewedBy,
                      selectedApplicant.documentsReviewedAt,
                      () => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          documentsStatus: 'approved',
                          status: 'documents_verified',
                          documentsReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          documentsReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("✅ Documentos validados con éxito.");
                      },
                      (reason) => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          documentsStatus: 'observed',
                          documentsObservation: reason,
                          status: 'observed',
                          documentsReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          documentsReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("⚠️ Documentos marcados como Observados.");
                      },
                      (reason) => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          documentsStatus: 'rejected',
                          documentsRejectedReason: reason,
                          status: 'rejected',
                          documentsReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          documentsReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("❌ Documentos rechazados permanentemente.");
                      },
                      'Documentos Obligatorios'
                    )}
                  </div>

                </div>
              )}

              {/* TAB CONTENT: DERECHO DE ADMISIÓN */}
              {activeApplicantTab === 'pago' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  {/* Section A: Pago de derecho de admisión */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      Detalles de Pago de Derecho de Admisión
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Estado de Validación</span>
                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border mt-1 ${
                          selectedApplicant.paymentState === 'paid' ? 'bg-green-100 text-green-800' :
                          selectedApplicant.paymentState === 'observed' ? 'bg-amber-100 text-amber-800' :
                          selectedApplicant.paymentState === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedApplicant.paymentState === 'paid' ? 'Aprobado (Pagado)' :
                           selectedApplicant.paymentState === 'observed' ? 'Observado' :
                           selectedApplicant.paymentState === 'rejected' ? 'Rechazado' :
                           'Pendiente de Validación'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Monto Facturado</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 font-mono text-xs">S/. {selectedApplicant.paymentAmount?.toFixed(2) || '350.00'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fecha de Transacción</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.paymentDate || 'No registrada'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Código de Operación / Referencia</span>
                        <span className="font-extrabold text-slate-800 block mt-0.5 font-mono">{selectedApplicant.paymentCode || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Inline visualizer for payment receipt */}
                    <div className="pt-2 border-t border-slate-150">
                      <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Comprobante de Pago Digital (Cargado en Línea)</span>
                      {selectedApplicant.paymentComprobante ? (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-200">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-black text-slate-700 text-xs">{selectedApplicant.paymentComprobante}</p>
                              <p className="text-[9px] text-slate-400 font-bold">Comprobante verificado con código interbancario.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerToast(`📥 Descargando comprobante: ${selectedApplicant.paymentComprobante}`)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer"
                          >
                            Descargar Comprobante
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center text-slate-400">
                          <AlertTriangle className="w-6 h-6 text-slate-300 mb-1" />
                          <p className="text-[11px] font-semibold">El apoderado aún no ha adjuntado un archivo de comprobante.</p>
                          <p className="text-[9px] mt-0.5">El pago puede validarse administrativamente mediante depósito directo.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision Panel for Payment Stage */}
                  <div className="pt-1">
                    {renderDecisionPanel(
                      'payment',
                      selectedApplicant.paymentState === 'paid' ? 'approved' : selectedApplicant.paymentState === 'observed' ? 'observed' : selectedApplicant.paymentState === 'rejected' ? 'rejected' : undefined,
                      selectedApplicant.paymentObservation,
                      selectedApplicant.paymentRejectedReason,
                      selectedApplicant.paymentReviewedBy,
                      selectedApplicant.paymentReviewedAt,
                      () => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          paymentState: 'paid',
                          paymentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          paymentReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("✅ Pago aprobado y registrado en el sistema.");
                      },
                      (reason) => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          paymentState: 'observed',
                          paymentObservation: reason,
                          paymentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          paymentReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("⚠️ Pago marcado como Observado.");
                      },
                      (reason) => {
                        const updated: AdmissionRecord = {
                          ...selectedApplicant,
                          paymentState: 'rejected',
                          paymentRejectedReason: reason,
                          status: 'rejected',
                          paymentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                          paymentReviewedAt: new Date().toLocaleString('es-PE')
                        };
                        onSaveRecord(updated);
                        setSelectedApplicant(updated);
                        triggerToast("❌ Pago rechazado permanentemente.");
                      },
                      'Pago Derecho de Admisión'
                    )}
                  </div>

                </div>
              )}

              {/* TAB CONTENT: CITA PSICOPEDAGÓGICA */}
              {activeApplicantTab === 'cita' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  {/* Section B: Cita Psicopedagógica */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Evaluación de Especialista Psicopedagógico
                    </h4>
                    
                    {selectedApplicant.appointment ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fecha de Cita</span>
                          <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.appointment.dateLabel || selectedApplicant.appointment.date}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Turno / Horario</span>
                          <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.appointment.timeSlot || selectedApplicant.appointment.time}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Especialista Psicólogo</span>
                          <span className="font-extrabold text-blue-800 block mt-0.5 uppercase">{selectedApplicant.appointment.psychologist || 'Por Designar'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Observaciones Agendamiento</span>
                          <span className="font-bold text-slate-600 block mt-0.5">{selectedApplicant.appointment.psychologist ? 'Agendado y confirmado' : 'Pendiente especialista'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 border border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <Clock className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="font-bold text-[11px]">Cita Psicopedagógica aún no ha sido programada.</p>
                        <p className="text-[9px] mt-0.5">Vaya al módulo correspondiente en la barra lateral para agendar.</p>
                      </div>
                    )}
                  </div>

                  {/* Decision Panel for Appointment Stage */}
                  {selectedApplicant.appointment && (
                    <div className="pt-1">
                      {renderDecisionPanel(
                        'appointment',
                        selectedApplicant.appointmentApproved || selectedApplicant.appointmentStatus === 'approved' ? 'approved' : selectedApplicant.appointmentStatus === 'observed' ? 'observed' : selectedApplicant.appointmentStatus === 'rejected' ? 'rejected' : undefined,
                        selectedApplicant.appointmentObservation,
                        selectedApplicant.appointmentRejectedReason,
                        selectedApplicant.appointmentReviewedBy,
                        selectedApplicant.appointmentReviewedAt,
                        () => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            appointmentApproved: true,
                            appointmentStatus: 'approved',
                            appointmentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            appointmentReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("✅ Cita psicopedagógica aprobada.");
                        },
                        (reason) => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            appointmentApproved: false,
                            appointmentStatus: 'observed',
                            appointmentObservation: reason,
                            appointmentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            appointmentReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("⚠️ Cita marcada como Observada.");
                        },
                        (reason) => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            appointmentApproved: false,
                            appointmentStatus: 'rejected',
                            appointmentRejectedReason: reason,
                            status: 'rejected',
                            appointmentReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            appointmentReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("❌ Cita rechazada permanentemente.");
                        },
                        'Cita Psicopedagógica'
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* TAB CONTENT: EVALUACIÓN ACADÉMICA */}
              {activeApplicantTab === 'evaluacion' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  {/* Section C: Evaluación Académica */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Evaluación de Competencias Académicas
                    </h4>
                    
                    {(() => {
                      const gradeName = selectedApplicant.formState.postulacion.gradoIngreso;
                      const requiresEval = gradeName && !gradeName.toLowerCase().includes('inicial');
                      
                      if (!requiresEval) {
                        return (
                          <div className="bg-slate-50 p-4 rounded-xl border text-center text-slate-500 flex flex-col items-center justify-center">
                            <Check className="w-6 h-6 text-green-500 mb-1" />
                            <p className="font-extrabold text-[11px]">No Aplica para Grado de Inicial.</p>
                            <p className="text-[9px] mt-0.5">El nivel Inicial (3, 4 y 5 años) no rinde examen académico según directivas del Minedu.</p>
                          </div>
                        );
                      }

                      if (selectedApplicant.academicEvaluation) {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fecha del Examen</span>
                              <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.academicEvaluation.dateLabel}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Horario Asignado</span>
                              <span className="font-extrabold text-slate-800 block mt-0.5">{selectedApplicant.academicEvaluation.timeSlot}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Observaciones Examen</span>
                              <span className="font-bold text-slate-600 block mt-0.5 uppercase">{(selectedApplicant.academicEvaluation as any).observations || 'Sin observaciones'}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 border border-dashed border-slate-200 flex flex-col items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-slate-300 mb-1" />
                          <p className="font-bold text-[11px]">Evaluación Académica aún no ha sido agendada.</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Decision Panel for Academic Stage */}
                  {(() => {
                    const gradeName = selectedApplicant.formState.postulacion.gradoIngreso;
                    const requiresEval = gradeName && !gradeName.toLowerCase().includes('inicial');
                    
                    if (requiresEval && selectedApplicant.academicEvaluation) {
                      return (
                        <div className="pt-1">
                          {renderDecisionPanel(
                            'academic',
                            selectedApplicant.academicEvaluationApproved || selectedApplicant.academicEvaluationStatus === 'approved' ? 'approved' : selectedApplicant.academicEvaluationStatus === 'observed' ? 'observed' : selectedApplicant.academicEvaluationStatus === 'rejected' ? 'rejected' : undefined,
                            selectedApplicant.academicEvaluationObservation,
                            selectedApplicant.academicEvaluationRejectedReason,
                            selectedApplicant.academicEvaluationReviewedBy,
                            selectedApplicant.academicEvaluationReviewedAt,
                            () => {
                              const updated: AdmissionRecord = {
                                ...selectedApplicant,
                                academicEvaluationApproved: true,
                                academicEvaluationStatus: 'approved',
                                academicEvaluationReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                                academicEvaluationReviewedAt: new Date().toLocaleString('es-PE')
                              };
                              onSaveRecord(updated);
                              setSelectedApplicant(updated);
                              triggerToast("✅ Evaluación académica aprobada.");
                            },
                            (reason) => {
                              const updated: AdmissionRecord = {
                                ...selectedApplicant,
                                academicEvaluationApproved: false,
                                academicEvaluationStatus: 'observed',
                                academicEvaluationObservation: reason,
                                academicEvaluationReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                                academicEvaluationReviewedAt: new Date().toLocaleString('es-PE')
                              };
                              onSaveRecord(updated);
                              setSelectedApplicant(updated);
                              triggerToast("⚠️ Evaluación marcada como Observada.");
                            },
                            (reason) => {
                              const updated: AdmissionRecord = {
                                ...selectedApplicant,
                                academicEvaluationApproved: false,
                                academicEvaluationStatus: 'rejected',
                                academicEvaluationRejectedReason: reason,
                                status: 'rejected',
                                academicEvaluationReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                                academicEvaluationReviewedAt: new Date().toLocaleString('es-PE')
                              };
                              onSaveRecord(updated);
                              setSelectedApplicant(updated);
                              triggerToast("❌ Evaluación rechazada permanentemente.");
                            },
                            'Evaluación Académica'
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>
              )}

              {/* TAB CONTENT: OBSERVACIONES */}
              {activeApplicantTab === 'observaciones' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Consolidado General de Observaciones y Rechazos de Etapa
                    </h4>

                    <div className="space-y-3 pt-1">
                      {[
                        { name: '1. Documentación Obligatoria', status: selectedApplicant.documentsStatus, obs: selectedApplicant.documentsObservation || selectedApplicant.documentsRejectedReason, reviewer: selectedApplicant.documentsReviewedBy, date: selectedApplicant.documentsReviewedAt },
                        { name: '2. Derecho de Admisión', status: selectedApplicant.paymentState === 'paid' ? 'approved' : selectedApplicant.paymentState === 'observed' ? 'observed' : selectedApplicant.paymentState === 'rejected' ? 'rejected' : undefined, obs: selectedApplicant.paymentObservation || selectedApplicant.paymentRejectedReason, reviewer: selectedApplicant.paymentReviewedBy, date: selectedApplicant.paymentReviewedAt },
                        { name: '3. Cita Psicopedagógica', status: selectedApplicant.appointmentStatus, obs: selectedApplicant.appointmentObservation || selectedApplicant.appointmentRejectedReason, reviewer: selectedApplicant.appointmentReviewedBy, date: selectedApplicant.appointmentReviewedAt },
                        { name: '4. Evaluación Académica', status: selectedApplicant.academicEvaluationStatus, obs: selectedApplicant.academicEvaluationObservation || selectedApplicant.academicEvaluationRejectedReason, reviewer: selectedApplicant.academicEvaluationReviewedBy, date: selectedApplicant.academicEvaluationReviewedAt },
                        { name: '5. Admisión Final del Plantel', status: selectedApplicant.finalStatus, obs: selectedApplicant.finalStatusObservation || selectedApplicant.finalStatusRejectedReason, reviewer: selectedApplicant.finalStatusReviewedBy, date: selectedApplicant.finalStatusReviewedAt }
                      ].map((stage, idx) => {
                        return (
                          <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <span className="font-extrabold text-slate-700 text-xs">{stage.name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                stage.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                stage.status === 'observed' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                stage.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {stage.status === 'approved' ? 'Etapa Aprobada ✓' :
                                 stage.status === 'observed' ? 'Observado ⚠️' :
                                 stage.status === 'rejected' ? 'Rechazado ❌' :
                                 'Pendiente de Revisión'}
                              </span>
                            </div>
                            {stage.obs ? (
                              <p className="text-[11px] font-bold text-slate-600 italic bg-white p-2.5 rounded-lg border leading-relaxed">
                                "{stage.obs}"
                                {stage.reviewer && (
                                  <span className="block text-[9px] text-slate-400 mt-1 font-sans">
                                    Revisado por: {stage.reviewer} el {stage.date}
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">No se registraron comentarios u observaciones en esta etapa.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: HISTORIAL / TIMELINE */}
              {activeApplicantTab === 'historial' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      Línea de Tiempo del Expediente de Admisión
                    </h4>

                    {/* Timeline */}
                    <div className="relative pl-5 border-l-2 border-slate-200 space-y-5 py-2">
                      {timelineEvents.map((event, idx) => {
                        return (
                          <div key={idx} className="relative">
                            
                            {/* Icon circle on the left line */}
                            <div className={`absolute -left-[26px] top-0.5 w-3 h-3 rounded-full border bg-white ${
                              event.type === 'success' ? 'border-green-500 ring-2 ring-green-100' :
                              event.type === 'danger' ? 'border-rose-500 ring-2 ring-rose-100' :
                              event.type === 'warning' ? 'border-amber-500 ring-2 ring-amber-100' :
                              'border-blue-500 ring-2 ring-blue-100'
                            }`} />
                            
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-mono font-black">
                                <span className="text-slate-800">{event.date}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{event.user}</span>
                              </div>
                              <h5 className="font-extrabold text-slate-800 text-xs">{event.title}</h5>
                              <p className="text-[11px] text-slate-500 max-w-2xl leading-normal bg-slate-50 p-2 rounded-lg border">{event.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: ESTADO DEL PROCESO & DECISIÓN FINAL */}
              {activeApplicantTab === 'proceso' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  {/* Step visualizer */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Progreso Secuencial de Admisión</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { name: '1. Ficha Técnica', status: '✓ Completado', bg: 'bg-green-50 text-green-800 border-green-200 font-semibold' },
                        { name: '2. Documentos', status: selectedApplicant.documentsStatus === 'approved' ? '✓ Aprobado' : selectedApplicant.documentsStatus === 'observed' ? '⚠️ Observado' : selectedApplicant.documentsStatus === 'rejected' ? '❌ Rechazado' : '⏳ Pendiente', bg: selectedApplicant.documentsStatus === 'approved' ? 'bg-green-50 text-green-800 border-green-200' : selectedApplicant.documentsStatus === 'observed' ? 'bg-amber-50 text-amber-800 border-amber-200' : selectedApplicant.documentsStatus === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-100' },
                        { name: '3. Derecho Admisión', status: selectedApplicant.paymentState === 'paid' ? '✓ Pagado' : selectedApplicant.paymentState === 'observed' ? '⚠️ Observado' : selectedApplicant.paymentState === 'rejected' ? '❌ Rechazado' : '⏳ Pendiente', bg: selectedApplicant.paymentState === 'paid' ? 'bg-green-50 text-green-800 border-green-200' : selectedApplicant.paymentState === 'observed' ? 'bg-amber-50 text-amber-800 border-amber-200' : selectedApplicant.paymentState === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-100' },
                        { name: '4. Cita Psicopedagógica', status: selectedApplicant.appointmentStatus === 'approved' ? '✓ Completo' : selectedApplicant.appointmentStatus === 'observed' ? '⚠️ Observado' : selectedApplicant.appointmentStatus === 'rejected' ? '❌ Rechazado' : '⏳ Pendiente', bg: selectedApplicant.appointmentStatus === 'approved' ? 'bg-green-50 text-green-800 border-green-200' : selectedApplicant.appointmentStatus === 'observed' ? 'bg-amber-50 text-amber-800 border-amber-200' : selectedApplicant.appointmentStatus === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-100' },
                        { name: '5. Evaluación Académica', status: (() => {
                          const gradeName = selectedApplicant.formState.postulacion.gradoIngreso;
                          const requiresEval = gradeName && !gradeName.toLowerCase().includes('inicial');
                          if (!requiresEval) return '✓ No Aplica';
                          return selectedApplicant.academicEvaluationStatus === 'approved' ? '✓ Aprobado' : selectedApplicant.academicEvaluationStatus === 'observed' ? '⚠️ Observado' : selectedApplicant.academicEvaluationStatus === 'rejected' ? '❌ Rechazado' : '⏳ Pendiente';
                        })(), bg: (() => {
                          const gradeName = selectedApplicant.formState.postulacion.gradoIngreso;
                          const requiresEval = gradeName && !gradeName.toLowerCase().includes('inicial');
                          if (!requiresEval) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                          return selectedApplicant.academicEvaluationStatus === 'approved' ? 'bg-green-50 text-green-800 border-green-200' : selectedApplicant.academicEvaluationStatus === 'observed' ? 'bg-amber-50 text-amber-800 border-amber-200' : selectedApplicant.academicEvaluationStatus === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-100';
                        })() },
                        { name: '6. Admisión Final', status: selectedApplicant.finalStatus === 'approved' ? '✓ ADMITIDO' : selectedApplicant.finalStatus === 'observed' ? '⚠️ Observado' : selectedApplicant.finalStatus === 'rejected' ? '❌ Rechazado' : '⏳ Pendiente', bg: selectedApplicant.finalStatus === 'approved' ? 'bg-green-50 text-green-800 border-green-200' : selectedApplicant.finalStatus === 'observed' ? 'bg-amber-50 text-amber-800 border-amber-200' : selectedApplicant.finalStatus === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-100' },
                        { name: '7. Matrícula', status: selectedApplicant.status === 'enrolled' ? '✓ MATRICULADO' : '⏳ Pendiente', bg: selectedApplicant.status === 'enrolled' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-100' }
                      ].map((step, sIdx) => {
                        return (
                          <div key={sIdx} className={`p-2.5 rounded-xl border flex flex-col justify-between ${step.bg}`}>
                            <span className="font-extrabold text-[9px] text-slate-500 block uppercase tracking-wider">{step.name}</span>
                            <span className="font-black text-[10px] mt-1.5 block">{step.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Decisión Final del Proceso panel */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b pb-1.5">Etapa 4: Estado Final de Admisión del Postulante</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      La decisión de ingreso es la declaración institucional definitiva sobre la postulación. Al ser aprobado el expediente, el postulante es declarado APTO y se le reserva una vacante oficial en el grado e infraestructura académica asignada.
                    </p>
                    
                    <div className="pt-1">
                      {renderDecisionPanel(
                        'final',
                        selectedApplicant.finalStatus || (selectedApplicant.status === 'admitted' || selectedApplicant.status === 'enrolled' ? 'approved' : selectedApplicant.status === 'observed' ? 'observed' : selectedApplicant.status === 'rejected' ? 'rejected' : undefined),
                        selectedApplicant.finalStatusObservation,
                        selectedApplicant.finalStatusRejectedReason,
                        selectedApplicant.finalStatusReviewedBy,
                        selectedApplicant.finalStatusReviewedAt,
                        () => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            finalStatus: 'approved',
                            status: 'admitted',
                            finalStatusReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            finalStatusReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("✅ Postulación admitida de forma final.");
                        },
                        (reason) => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            finalStatus: 'observed',
                            finalStatusObservation: reason,
                            status: 'observed',
                            finalStatusReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            finalStatusReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("⚠️ Postulación marcada como Observada.");
                        },
                        (reason) => {
                          const updated: AdmissionRecord = {
                            ...selectedApplicant,
                            finalStatus: 'rejected',
                            finalStatusRejectedReason: reason,
                            status: 'rejected',
                            finalStatusReviewedBy: currentUser?.nombres || currentUser?.username || 'Administrador',
                            finalStatusReviewedAt: new Date().toLocaleString('es-PE')
                          };
                          onSaveRecord(updated);
                          setSelectedApplicant(updated);
                          triggerToast("❌ Postulación rechazada permanentemente.");
                        },
                        'Estado Final de Admisión'
                      )}
                    </div>
                  </div>

                  {/* Panel de Cambio de Estado Forzado (Overwrites) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sobrescribir Estado del Proceso (Modo Forzado)</span>
                        <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full border mt-1 ${getStatusLabel(selectedApplicant.status).bg}`}>
                          {getStatusLabel(selectedApplicant.status).text}
                        </span>
                      </div>

                      {!isChangingStatus ? (
                        <button
                          onClick={() => {
                            setTempStatus(selectedApplicant.status);
                            setIsChangingStatus(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Forzar Cambio de Estado
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleSaveStatusChange}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer"
                          >
                            Guardar Estado
                          </button>
                          <button
                            onClick={() => setIsChangingStatus(false)}
                            className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-[10px] transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {isChangingStatus && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          Seleccione el nuevo estado para este postulante:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { val: 'pending_approval', label: 'Pre-Inscripción Pendiente' },
                            { val: 'ready_for_completion', label: 'Pte. Completar Ficha' },
                            { val: 'documents_pending', label: 'Pendiente Documentos' },
                            { val: 'documents_submitted', label: 'Doc. Recibidos' },
                            { val: 'documents_verified', label: 'Doc. Verificados' },
                            { val: 'interview_scheduled', label: 'Cita Psicológica' },
                            { val: 'interview_completed', label: 'Entrevista Hecha' },
                            { val: 'admitted', label: 'Admitido (Vacante Reservada)' },
                            { val: 'enrolled', label: 'Matriculado con Aula' },
                            { val: 'observed', label: 'Con Observaciones' },
                            { val: 'waiting_list', label: 'Lista de Espera' }
                          ].map((opt) => (
                            <label key={opt.val} className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer text-[10px] font-bold text-slate-700">
                              <input
                                type="radio"
                                name="modal_status"
                                value={opt.val}
                                checked={tempStatus === opt.val}
                                onChange={() => setTempStatus(opt.val)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Fixed Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-5 rounded-xl text-xs transition cursor-pointer hover:scale-101 active:scale-95 shadow-sm"
              >
                Cerrar Expediente
              </button>
            </div>

          </motion.div>
        </div>
  );
}
