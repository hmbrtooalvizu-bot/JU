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
  PlusCircle,
  Camera,
  RotateCw,
  X
} from 'lucide-react';
import { downloadConstanciaPDF } from '../utils/pdfGenerator';

interface DashboardViewProps {
  currentUser: any;
  records: any[];
  saveRecord: (record: any) => void;
  setCurrentUser: (record: any) => void;
  triggerToast: (msg: string) => void;
  onRegisterSibling?: (siblingFormState: any) => void;
  admissionFee: number;
}

export default function DashboardView({ 
  currentUser, 
  records, 
  saveRecord, 
  setCurrentUser, 
  triggerToast,
  onRegisterSibling,
  admissionFee
}: DashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ficha' | 'documentos' | 'cita' | 'matricula'>('ficha');
  const [selectedStepId, setSelectedStepId] = useState<number>(1);
  const [selectedEvalDate, setSelectedEvalDate] = useState<string>('');
  const [selectedEvalTime, setSelectedEvalTime] = useState<string>('');

  const evalTimeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'];

  const getSaturdaysRange = (startDateStr: string) => {
    const dates = [];
    const start = startDateStr ? new Date(startDateStr) : new Date();
    // Up to 30 days
    for (let i = 0; i < 30; i++) {
      const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      if (current.getDay() === 6) { // 6 = Saturday
        const key = current.toISOString().split('T')[0];
        const label = current.toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        dates.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    return dates;
  };

  const evalSaturdays = React.useMemo(() => {
    const start = currentUser?.fichaCompletedAt || currentUser?.createdAt || new Date().toISOString();
    return getSaturdaysRange(start);
  }, [currentUser?.fichaCompletedAt, currentUser?.createdAt]);

  useEffect(() => {
    if (evalSaturdays.length > 0 && !selectedEvalDate) {
      setSelectedEvalDate(evalSaturdays[0].key);
    }
  }, [evalSaturdays, selectedEvalDate]);

  useEffect(() => {
    if (!selectedEvalTime) {
      setSelectedEvalTime(evalTimeSlots[0]);
    }
  }, [selectedEvalTime]);

  const gradeRequiresEvaluation = (gradeName: string) => {
    if (!gradeName) return false;
    const gn = gradeName.toLowerCase();
    return !gn.includes('inicial');
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

  const isNewStudent = currentUser?.formState?.postulacion?.tipoAlumno === 'nuevo';
  const isPrivateSchool = isNewStudent && (currentUser?.formState?.personales?.tipoColegioProcedencia === 'Colegio Particular');
  
  const requiresGoodConduct = (gradeName: string) => {
    if (!gradeName) return false;
    const g = gradeName.toUpperCase();
    if (g.includes("SECUNDARIA") || g.includes("PREUNIVERSITARIO")) {
      return true;
    }
    if (g.includes("PRIMARIA")) {
      const is5th = g.includes("5TO") || g.includes("5°") || g.includes("5.º") || g.includes("5TO GRADO") || g.includes("QUINTO") || g.includes("5 ") || g.includes("5GRADO");
      const is6th = g.includes("6TO") || g.includes("6°") || g.includes("6.º") || g.includes("6TO GRADO") || g.includes("SEXTO") || g.includes("6 ") || g.includes("6GRADO");
      if (is5th || is6th) {
        return true;
      }
    }
    if (g.includes("5TO") || g.includes("6TO") || g.includes("5° GRADO") || g.includes("6° GRADO") || g.includes("5.º GRADO") || g.includes("6.º GRADO")) {
      return true;
    }
    return false;
  };
  const isconductRequired = isNewStudent && requiresGoodConduct(currentUser?.formState?.postulacion?.gradoIngreso || '');

  // Document management helpers
  const docsList = React.useMemo(() => {
    const list = [];
    
    // 1. DNI del Apoderado (Always requested, but shared)
    list.push({ key: 'dniApoderado', label: 'DNI del Apoderado' });
    
    // 2. DNI Alumno (Always required, individual)
    list.push({ key: 'dniPostulante', label: 'DNI del Alumno Postulante' });
    
    // 3. Recibo de Servicio (Always required, shared)
    list.push({ key: 'reciboServicio', label: 'Recibo de Servicio' });
    
    // 4. Constancia de No Adeudo (only if Colegio Particular and New student, individual)
    if (isPrivateSchool) {
      list.push({ key: 'constanciaNoAdeudo', label: 'Constancia de No Adeudo de Pensiones del nido/colegio de procedencia' });
    }
    
    // 5. Carta de Buena Conducta (only if 5to de Primaria up and New student, individual)
    if (isconductRequired) {
      list.push({ key: 'cartaConducta', label: 'Carta de Buena Conducta' });
    }
    
    return list;
  }, [isPrivateSchool, isconductRequired]);

  const SHARED_DOC_KEYS = ['dniApoderado', 'reciboServicio'];
  const uploadedCount = docsList.filter(doc => {
    const isShared = SHARED_DOC_KEYS.includes(doc.key);
    return isShared
      ? familyRecords.some(r => !!r.documents?.[doc.key])
      : !!currentUser.documents?.[doc.key];
  }).length;
  const isDocsComplete = uploadedCount === docsList.length;
  const isApptBooked = !!currentUser.appointment;
  const isMatriculado = currentUser.status === 'matriculado';

  const steps = React.useMemo(() => {
    // 1. Ficha Técnica
    const isFichaCompleted = true;
    const step1Status = 'completed';

    // 2. Documentos
    const isStep2Unlocked = true;
    const isStep2DocsUploaded = isDocsComplete;
    const isStep2Approved = currentUser?.status !== 'pending_approval' && 
                           currentUser?.status !== 'ready_for_completion' &&
                           currentUser?.status !== 'documents_pending' && 
                           currentUser?.status !== 'documents_submitted' &&
                           currentUser?.status !== 'observed';
    const step2Status = !isStep2Unlocked 
      ? 'locked' 
      : (isStep2Approved ? 'completed' : (isStep2DocsUploaded ? 'reviewing' : 'pending_action'));

    // 3. Pago por Derecho de Admisión
    const isStep3Unlocked = isStep2Approved;
    const isStep3Paid = currentUser?.paymentState === 'paid';
    const isStep3Reviewing = currentUser?.paymentState === 'reviewing';
    const isStep3Rejected = currentUser?.paymentState === 'rejected';
    const step3Status = !isStep3Unlocked 
      ? 'locked' 
      : (isStep3Paid ? 'completed' : (isStep3Reviewing ? 'reviewing' : (isStep3Rejected ? 'rejected' : 'pending_action')));

    // 4. Cita Psicopedagógica
    const isStep4Unlocked = isStep3Paid;
    const isStep4Booked = !!currentUser?.appointment;
    const isStep4Approved = !!currentUser?.appointmentApproved;
    const step4Status = !isStep4Unlocked 
      ? 'locked' 
      : (isStep4Approved ? 'completed' : (isStep4Booked ? 'reviewing' : 'pending_action'));

    // 5. Evaluación Académica
    const requiresEval = gradeRequiresEvaluation(currentUser?.formState?.postulacion?.gradoIngreso);
    const isStep5Unlocked = isStep4Unlocked && isStep4Approved;
    const isStep5Booked = !!currentUser?.academicEvaluation;
    const isStep5Approved = !requiresEval || !!currentUser?.academicEvaluationApproved;
    const step5Status = !requiresEval 
      ? 'not_applicable' 
      : (!isStep5Unlocked ? 'locked' : (isStep5Approved ? 'completed' : (isStep5Booked ? 'reviewing' : 'pending_action')));

    // 6. Estado Final
    const isStep6Unlocked = requiresEval 
      ? (isStep5Unlocked && isStep5Approved) 
      : (isStep4Unlocked && isStep4Approved);
    const isAdmittedOrEnrolled = currentUser?.status === 'admitted' || currentUser?.status === 'enrolled' || currentUser?.status === 'matriculado';
    const step6Status = !isStep6Unlocked 
      ? 'locked' 
      : (isAdmittedOrEnrolled ? 'completed' : 'reviewing');

    return [
      { id: 1, label: 'Ficha Técnica', status: step1Status, description: 'Datos iniciales del postulante' },
      { id: 2, label: 'Documentos', status: step2Status, description: 'Carga de documentación oficial' },
      { id: 3, label: 'Pago de Admisión', status: step3Status, description: 'Derecho de examen de admisión' },
      { id: 4, label: 'Cita Psicopedagógica', status: step4Status, description: 'Entrevista psicológica familiar' },
      { id: 5, label: 'Evaluación Académica', status: step5Status, description: 'Evaluación para Primaria / Secundaria' },
      { id: 6, label: 'Estado Final', status: step6Status, description: 'Aprobación institucional y matrícula' }
    ];
  }, [currentUser, isDocsComplete]);

  // Auto-select current active step when child changes
  useEffect(() => {
    const currentActiveStep = steps.find(s => s.status !== 'completed' && s.status !== 'not_applicable');
    if (currentActiveStep) {
      setSelectedStepId(currentActiveStep.id);
    } else {
      setSelectedStepId(6);
    }
  }, [currentUser?.id]);
  
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

  // Helper to handle updating document state and propagating shared files among siblings
  const handleUpdateDocumentState = (docKey: string, fileName: string | null) => {
    const SHARED_DOC_KEYS = ['dniApoderado', 'reciboServicio'];
    const isShared = SHARED_DOC_KEYS.includes(docKey);

    // Update current user's document
    const currentUserDocs = {
      ...currentUser.documents,
      [docKey]: fileName
    };

    // Helper to calculate whether all documents are complete for a specific record
    const checkDocsCompleteForRecord = (record: any, customDocs: any) => {
      const recordIsNew = record?.formState?.postulacion?.tipoAlumno === 'nuevo';
      const recordIsPrivate = recordIsNew && (record.formState?.personales?.tipoColegioProcedencia === 'Colegio Particular');
      const recordIsConductRequired = recordIsNew && requiresGoodConduct(record.formState?.postulacion?.gradoIngreso || '');

      const reqDocs = ['dniApoderado', 'dniPostulante', 'reciboServicio'];
      if (recordIsPrivate) reqDocs.push('constanciaNoAdeudo');
      if (recordIsConductRequired) reqDocs.push('cartaConducta');

      return reqDocs.every(k => !!customDocs?.[k]);
    };

    const isCurrentUserComplete = checkDocsCompleteForRecord(currentUser, currentUserDocs);
    const newCurrentUserStatus = isCurrentUserComplete ? 'documents_submitted' : 'documents_pending';

    const updatedCurrentUser = {
      ...currentUser,
      documents: currentUserDocs,
      status: currentUser.status === 'documents_pending' || currentUser.status === 'documents_submitted' || currentUser.status === 'observed'
        ? newCurrentUserStatus 
        : currentUser.status
    };

    saveRecord(updatedCurrentUser);
    setCurrentUser(updatedCurrentUser);

    // Propagate to other family records if shared
    familyRecords.forEach(sibling => {
      if (sibling.id !== currentUser.id) {
        const siblingDocs = {
          ...sibling.documents,
          ...(isShared ? { [docKey]: fileName } : {})
        };

        const isSiblingComplete = checkDocsCompleteForRecord(sibling, siblingDocs);
        const newSiblingStatus = isSiblingComplete ? 'documents_submitted' : 'documents_pending';

        const updatedSibling = {
          ...sibling,
          documents: siblingDocs,
          status: sibling.status === 'documents_pending' || sibling.status === 'documents_submitted' || sibling.status === 'observed'
            ? newSiblingStatus
            : sibling.status
        };

        saveRecord(updatedSibling);
      }
    });
  };

  // Synchronize shared documents across all family records if they are out of sync or newly registered
  useEffect(() => {
    if (familyRecords.length <= 1) return;

    const SHARED_DOC_KEYS = ['dniApoderado', 'reciboServicio'];
    let needsSync = false;
    
    // Find the best value for each shared document key
    const bestSharedDocs: Record<string, string | null> = {};
    SHARED_DOC_KEYS.forEach(key => {
      const found = familyRecords.find(r => !!r.documents?.[key]);
      bestSharedDocs[key] = found ? found.documents[key] : null;
    });

    // Check if any record lacks the best value or has a discrepancy
    const updatedRecords = familyRecords.map(record => {
      let docChanged = false;
      const updatedDocs = { ...record.documents };

      SHARED_DOC_KEYS.forEach(key => {
        if (updatedDocs[key] !== bestSharedDocs[key]) {
          updatedDocs[key] = bestSharedDocs[key];
          docChanged = true;
        }
      });

      if (docChanged) {
        needsSync = true;
        
        // Recalculate status
        const recordIsNew = record?.formState?.postulacion?.tipoAlumno === 'nuevo';
        const recordIsPrivate = recordIsNew && (record.formState?.personales?.tipoColegioProcedencia === 'Colegio Particular');
        const recordIsConductRequired = recordIsNew && requiresGoodConduct(record.formState?.postulacion?.gradoIngreso || '');

        const reqDocs = ['dniApoderado', 'dniPostulante', 'reciboServicio'];
        if (recordIsPrivate) reqDocs.push('constanciaNoAdeudo');
        if (recordIsConductRequired) reqDocs.push('cartaConducta');

        const isComplete = reqDocs.every(k => !!updatedDocs[k]);
        const newStatus = isComplete ? 'documents_submitted' : 'documents_pending';

        return {
          ...record,
          documents: updatedDocs,
          status: record.status === 'documents_pending' || record.status === 'documents_submitted' || record.status === 'observed'
            ? newStatus
            : record.status
        };
      }
      return record;
    });

    if (needsSync) {
      updatedRecords.forEach(rec => {
        const original = familyRecords.find(r => r.id === rec.id);
        if (original && JSON.stringify(original.documents) !== JSON.stringify(rec.documents)) {
          saveRecord(rec);
          if (rec.id === currentUser.id) {
            setCurrentUser(rec);
          }
        }
      });
    }
  }, [familyRecords, currentUser?.id]);

  // Camera capture states
  const [activeCameraDocKey, setActiveCameraDocKey] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
  const [showFlash, setShowFlash] = useState<boolean>(false);

  // Hook to handle video element stream assignment
  useEffect(() => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    if (video && cameraStream) {
      video.srcObject = cameraStream;
    }
  }, [cameraStream, activeCameraDocKey]);

  // Hook to clean up tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleOpenCamera = async (docKey: string) => {
    setActiveCameraDocKey(docKey);
    setCapturedImage(null);
    setCameraError(null);
    setShowFlash(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoIn = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoIn);
      
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        const activeIdx = videoIn.findIndex(d => d.deviceId === settings.deviceId);
        if (activeIdx !== -1) {
          setCurrentDeviceIndex(activeIdx);
        }
      }
    } catch (err: any) {
      console.error("Error opening camera:", err);
      setCameraError("No se pudo acceder a la cámara. Por favor otorgue los permisos correspondientes o use la opción de cargar archivo directamente.");
      triggerToast("⚠️ No se pudo acceder a la cámara. Verifique los permisos.");
    }
  };

  const handleSwitchCamera = async () => {
    if (videoDevices.length <= 1 || !cameraStream) return;

    cameraStream.getTracks().forEach(track => track.stop());

    const nextIdx = (currentDeviceIndex + 1) % videoDevices.length;
    setCurrentDeviceIndex(nextIdx);
    const nextDevice = videoDevices[nextIdx];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } }
      });
      setCameraStream(stream);
    } catch (err) {
      console.error("Error switching camera:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(fallbackStream);
      } catch (e) {
        setCameraError("No se pudo cambiar de cámara.");
      }
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setActiveCameraDocKey(null);
    setCapturedImage(null);
    setCameraError(null);
    setVideoDevices([]);
  };

  const handleCapturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    if (!video) return;

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirmCapturedPhoto = () => {
    if (!activeCameraDocKey || !capturedImage) return;

    const docKey = activeCameraDocKey;
    const simulatedFileName = `foto_${docKey}_capturada.jpg`;

    setUploadingDoc(docKey);
    setUploadProgress(10);
    handleCloseCamera();

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (docKey === 'paymentComprobante') {
              const updated = {
                ...currentUser,
                paymentComprobante: simulatedFileName,
                paymentState: 'reviewing',
                paymentDate: new Date().toLocaleDateString('es-PE')
              };
              saveRecord(updated);
              setCurrentUser(updated);
              setUploadingDoc(null);
              triggerToast(`✨ Foto de comprobante guardada con éxito.`);
            } else {
              handleUpdateDocumentState(docKey, simulatedFileName);
              setUploadingDoc(null);
              triggerToast(`✨ Foto guardada con éxito para "${docsList.find(d => d.key === docKey)?.label || docKey}".`);
            }
          }, 300);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  const handleSimulatedUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDoc(docKey);
      setUploadProgress(10);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              handleUpdateDocumentState(docKey, file.name);
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
    handleUpdateDocumentState(docKey, null);
    triggerToast("🗑️ Documento removido.");
  };

  const handlePaymentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDoc('paymentComprobante');
      setUploadProgress(10);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              const updated = {
                ...currentUser,
                paymentComprobante: file.name,
                paymentState: 'reviewing',
                paymentDate: new Date().toLocaleDateString('es-PE')
              };
              saveRecord(updated);
              setCurrentUser(updated);
              setUploadingDoc(null);
              triggerToast(`✨ Comprobante "${file.name}" cargado con éxito. Estado: En revisión.`);
            }, 300);
            return 100;
          }
          return prev + 30;
        });
      }, 200);
    }
  };

  const handleRemovePayment = () => {
    const updated = {
      ...currentUser,
      paymentComprobante: undefined,
      paymentState: undefined,
      paymentDate: undefined
    };
    saveRecord(updated);
    setCurrentUser(updated);
    triggerToast("🗑️ Comprobante removido.");
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
      status: currentUser.status === 'documents_verified' || currentUser.status === 'documents_pending' || currentUser.status === 'appointment_pending'
        ? 'interview_scheduled' 
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
      status: currentUser.status === 'interview_scheduled' ? 'documents_verified' : currentUser.status
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast("📅 Cita cancelada. Por favor agende una nueva fecha.");
  };

  const handleBookAcademicEvaluation = (slot: string) => {
    const dateLabel = evalSaturdays.find(d => d.key === selectedEvalDate)?.label || selectedEvalDate;
    
    const updatedRecord = {
      ...currentUser,
      academicEvaluation: {
        dateKey: selectedEvalDate,
        dateLabel,
        timeSlot: slot
      },
      academicEvaluationApproved: false
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast(`📝 Evaluación Académica reservada para el ${dateLabel} a las ${slot}.`);
  };

  const handleCancelAcademicEvaluation = () => {
    const updatedRecord = {
      ...currentUser,
      academicEvaluation: null,
      academicEvaluationApproved: false
    };

    saveRecord(updatedRecord);
    setCurrentUser(updatedRecord);
    triggerToast("📝 Evaluación Académica cancelada. Por favor agende una nueva fecha.");
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

  // Copy family credentials to clipboard
  const copyCredentials = () => {
    const credText = `Portal Admisión Juventud Científica 2027\nUsuario: ${currentUser.username}\nContraseña: ${currentUser.password}`;
    navigator.clipboard.writeText(credText);
    triggerToast("📋 Datos de acceso copiados al portapapeles.");
  };

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
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4 no-print mb-6">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Flujo del Proceso de Admisión 2027</h4>
        
        {/* Progress bar line and steps */}
        <div className="relative flex justify-between items-center max-w-4xl mx-auto px-4 py-2 overflow-x-auto gap-4 md:gap-0 scrollbar-none">
          
          {/* Horizontal connecting line */}
          <div className="absolute top-[28px] left-[40px] right-[40px] h-[3px] bg-slate-100 -z-0 hidden md:block" />

          {steps.map((st) => {
            const isSelected = selectedStepId === st.id;
            const isLocked = st.status === 'locked';
            const isCompleted = st.status === 'completed';
            const isReviewing = st.status === 'reviewing';
            const isRejected = st.status === 'rejected';
            const isNotApplicable = st.status === 'not_applicable';

            // Choose bullet circle style and icon
            let circleClass = 'bg-slate-100 border-slate-200 text-slate-400';
            let iconElement = <span className="font-bold">{st.id}</span>;

            if (isCompleted) {
              circleClass = 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200';
              iconElement = <Check className="w-4 h-4 text-white" />;
            } else if (isReviewing) {
              circleClass = 'bg-amber-400 border-amber-400 text-white shadow-amber-100';
              iconElement = <Clock className="w-4 h-4 text-white" />;
            } else if (isRejected) {
              circleClass = 'bg-rose-500 border-rose-500 text-white shadow-rose-200';
              iconElement = <X className="w-4 h-4 text-white" />;
            } else if (isNotApplicable) {
              circleClass = 'bg-slate-200 border-slate-300 text-slate-500 line-through';
              iconElement = <Info className="w-3.5 h-3.5" />;
            } else if (isSelected) {
              circleClass = 'bg-blue-600 border-blue-600 text-white shadow-blue-200';
            } else if (!isLocked) {
              circleClass = 'bg-blue-50 border-blue-300 text-blue-700 font-bold';
            }

            return (
              <div 
                key={st.id} 
                className={`flex flex-col items-center text-center relative z-10 shrink-0 max-w-[120px] ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                onClick={() => {
                  if (isLocked) {
                    triggerToast(`🔒 La etapa "${st.label}" se encuentra bloqueada. Debe completar y recibir la aprobación de las etapas previas.`);
                  } else {
                    setSelectedStepId(st.id);
                  }
                }}
              >
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md ${circleClass} ${isSelected ? 'scale-110 ring-4 ring-blue-100' : 'hover:scale-105'}`}>
                  {iconElement}
                </div>
                
                <span className={`text-[10px] font-black uppercase tracking-tight mt-2 ${isSelected ? 'text-blue-600' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                  {st.label}
                </span>

                {/* Small status label */}
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                  isCompleted ? 'bg-emerald-100 text-emerald-800' :
                  isReviewing ? 'bg-amber-100 text-amber-800' :
                  isRejected ? 'bg-rose-100 text-rose-800' :
                  isNotApplicable ? 'bg-slate-150 text-slate-500' :
                  isLocked ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-800'
                }`}>
                  {isCompleted ? 'Hecho' :
                   isReviewing ? 'En revisión' :
                   isRejected ? 'Rechazado' :
                   isNotApplicable ? 'No aplica' :
                   isLocked ? 'Bloqueado' : 'Pendiente'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Content Area */}
      <div className="no-print">
        {selectedStepId === 1 && (
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
                  <h3 className="text-xl font-black text-slate-900 uppercase">Ficha de Admisión Completa (Recomendado)</h3>
                  <p className="text-sm text-slate-700 leading-relaxed max-w-lg mx-auto">
                    Permite registrar todos los datos de contacto, padres, nacimiento e ingresos, habilitando la carga inmediata de documentos obligatorios.
                  </p>
                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        setIsCompletingForm(true);
                        setCompletionStep(1);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition duration-150 text-xs hover:scale-102 cursor-pointer"
                    >
                      ✏️ Completar Ficha de Admisión Completa Ahora
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

        {selectedStepId === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Carga de Documentación Obligatoria</h3>
              <p className="text-xs text-slate-500">Suba los archivos escaneados o fotografías legibles para que la Comisión verifique su expediente.</p>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {docsList.map((doc) => {
                const SHARED_DOC_KEYS = ['dniApoderado', 'reciboServicio'];
                const isShared = SHARED_DOC_KEYS.includes(doc.key);
                const isUploaded = isShared 
                  ? familyRecords.some(r => !!r.documents?.[doc.key]) 
                  : !!currentUser.documents?.[doc.key];
                const fileName = isShared 
                  ? (familyRecords.find(r => !!r.documents?.[doc.key])?.documents?.[doc.key] || '')
                  : (currentUser.documents?.[doc.key] || '');

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
                        /* Dual Options: Upload or Take Photo */
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {/* File Input trigger */}
                          <label className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101 active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Cargar archivo</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => handleSimulatedUpload(doc.key, e)}
                              className="hidden"
                            />
                          </label>

                          {/* Camera trigger */}
                          <button
                            type="button"
                            onClick={() => handleOpenCamera(doc.key)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101 active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                            <span>Tomar Foto</span>
                          </button>
                        </div>
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
                  <strong>Documentación Incompleta:</strong> Asegúrese de cargar los {docsList.length} documentos listados arriba para poder habilitar el último paso de <strong>"Matrícula"</strong>.
                </div>
              </div>
            )}

            {/* CAMERA MODAL OVERLAY */}
            <AnimatePresence>
              {activeCameraDocKey && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-slate-800 text-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative"
                  >
                    {/* Modal Header */}
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                          {docsList.find(d => d.key === activeCameraDocKey)?.label || 'Tomar fotografía'}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCloseCamera}
                        className="p-1 rounded-full hover:bg-slate-800 transition cursor-pointer text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Camera view area */}
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      {cameraError ? (
                        <div className="p-6 text-center space-y-3">
                          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                          <p className="text-xs text-slate-300 font-bold">{cameraError}</p>
                          <button
                            type="button"
                            onClick={handleCloseCamera}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition cursor-pointer"
                          >
                            Cerrar Ventana
                          </button>
                        </div>
                      ) : !capturedImage ? (
                        /* Live Stream Video */
                        <>
                          <video 
                            id="camera-video" 
                            className="w-full h-full object-cover"
                            autoPlay 
                            playsInline 
                            muted
                          />
                          {/* Guide frame overlay */}
                          <div className="absolute inset-6 border-2 border-dashed border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest bg-slate-950/70 px-3 py-1 rounded-full border border-white/10">
                              Alinee el documento aquí
                            </span>
                          </div>

                          {/* Flash animation */}
                          {showFlash && (
                            <div className="absolute inset-0 bg-white z-10 animate-fade-out" />
                          )}
                        </>
                      ) : (
                        /* Captured static image preview */
                        <img 
                          src={capturedImage} 
                          className="w-full h-full object-contain" 
                          alt="Vista previa capturada" 
                        />
                      )}
                    </div>

                    {/* Camera controls footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                      {!capturedImage && !cameraError ? (
                        /* Live view buttons */
                        <>
                          <button
                            type="button"
                            onClick={handleCloseCamera}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={handleCapturePhoto}
                            className="w-14 h-14 bg-white hover:bg-slate-100 text-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-800 focus:outline-none transition active:scale-90 cursor-pointer"
                            title="Capturar Foto"
                          >
                            <div className="w-8 h-8 bg-slate-900 rounded-full hover:bg-slate-800 transition" />
                          </button>

                          {videoDevices.length > 1 ? (
                            <button
                              type="button"
                              onClick={handleSwitchCamera}
                              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 font-bold"
                              title="Cambiar Cámara"
                            >
                              <RotateCw className="w-4 h-4" />
                              <span className="hidden sm:inline">Girar</span>
                            </button>
                          ) : (
                            <div className="w-20" /> // spacer
                          )}
                        </>
                      ) : capturedImage ? (
                        /* Approval / Retake view buttons */
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCapturedImage(null);
                              // Restart stream
                              if (activeCameraDocKey) {
                                handleOpenCamera(activeCameraDocKey);
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Volver a tomar</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleConfirmCapturedPhoto}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
                          >
                            <Check className="w-4 h-4" />
                            <span>Usar esta foto</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex justify-end">
                          <button
                            type="button"
                            onClick={handleCloseCamera}
                            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Cerrar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {selectedStepId === 3 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Pago por Derecho de Admisión 2027</h3>
              <p className="text-xs text-slate-500">
                Para validar el examen de ingreso, deberá efectuar el pago de S/. {admissionFee.toFixed(2)} por derecho de admisión y adjuntar el comprobante correspondiente.
              </p>
            </div>

            {currentUser.paymentState === 'paid' ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider">
                      Pago Aprobado y Validado
                    </span>
                    <h4 className="text-base font-black text-slate-950 uppercase">S/. {admissionFee.toFixed(2)} Recibidos Exitosamente</h4>
                    <p className="text-xs text-slate-700 leading-normal">
                      Su comprobante ({currentUser.paymentComprobante}) fue verificado y validado por Tesorería el {currentUser.paymentDate || new Date().toLocaleDateString('es-PE')}. La etapa de Cita Psicopedagógica se encuentra desbloqueada.
                    </p>
                  </div>
                </div>
              </div>
            ) : currentUser.paymentState === 'reviewing' ? (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-400 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs bg-amber-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider">
                      En Proceso de Revisión
                    </span>
                    <h4 className="text-sm font-black text-slate-900 uppercase">Comprobante en Verificación por Tesorería</h4>
                    <p className="text-xs text-slate-600 leading-normal">
                      Hemos recibido el comprobante <strong>"{currentUser.paymentComprobante}"</strong>. Nuestro departamento administrativo verificará la operación en un plazo máximo de 24 horas laborables. Una vez validado, se habilitará la siguiente fase de Cita Psicopedagógica.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">{currentUser.paymentComprobante}</span>
                  </div>
                  <button
                    onClick={handleRemovePayment}
                    className="text-xs text-red-600 hover:text-red-700 font-extrabold hover:underline"
                  >
                    Eliminar y subir otro comprobante
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {currentUser.paymentState === 'rejected' && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold block uppercase">Comprobante Rechazado / Observado</strong>
                      Por favor, verifique el monto y los datos de transferencia, y vuelva a subir una captura clara de su recibo de pago.
                    </div>
                  </div>
                )}

                {/* Info about Payment */}
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-xs text-blue-900 flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="font-extrabold text-[11px] uppercase tracking-wider text-blue-700">Código de Pago del Postulante</p>
                    <p className="text-lg font-mono font-black text-slate-800">
                      ADM-2027-{currentUser.id.split('-')[1] || '01'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Monto Total</p>
                    <p className="text-xl font-black text-slate-900">S/. {admissionFee.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Modalities */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Modalidades de Pago</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <span className="font-extrabold block text-blue-800">1. Depósito o Transferencia Bancaria</span>
                        <div className="space-y-1 text-slate-600">
                          <p><strong>Banco de la Nación:</strong> Cta Corriente <code>00-015-123456</code></p>
                          <p className="text-[10px] font-mono">CCI: <code>018-015-000015123456-02</code></p>
                          <p><strong>BCP (Soles):</strong> Cta Corriente <code>191-9876543-0-21</code></p>
                          <p className="text-[10px] font-mono">CCI: <code>002-191-009876543021-52</code></p>
                          <p className="text-[10px] text-slate-500"><strong>Referencia obligatoria:</strong> Indicar código de pago en el detalle.</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                        <span className="font-extrabold block text-blue-800">2. Pago Presencial en Colegio</span>
                        <p>Puede pagar en ventanilla de Tesorería en Sede Principal de Lunes a Viernes de 8:00 AM a 4:30 PM, y Sábados de 9:00 AM a 12:30 PM. Se acepta efectivo y tarjetas.</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Receipt */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Adjuntar Comprobante</h4>
                    
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-4 bg-slate-50/50 flex flex-col justify-center items-center">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-slate-700">Arrastre y suelte su comprobante de pago aquí</p>
                        <p className="text-[10px] text-slate-400">Archivos PDF, JPG o PNG de hasta 5MB</p>
                      </div>

                      {uploadingDoc === 'paymentComprobante' ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 justify-center">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Subiendo comprobante ({uploadProgress}%)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 justify-center pt-2">
                          <label className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold py-2 px-4 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101">
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Seleccionar Archivo</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handlePaymentUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleOpenCamera('paymentComprobante')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                            <span>Tomar Foto con Cámara</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStepId === 4 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-fade-in">
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
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                      currentUser.appointmentApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentUser.appointmentApproved ? 'Entrevista Realizada y Aprobada' : 'Cita Reservada Exitosamente'}
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

                {!currentUser.appointmentApproved && (
                  <button
                    onClick={handleCancelAppointment}
                    className="w-full md:w-auto bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2.5 px-4 rounded-xl border border-red-200 hover:border-red-300 transition duration-150 text-xs shadow-xs cursor-pointer"
                  >
                    Cancelar / Reagendar Cita
                  </button>
                )}
              </div>
            ) : (
              /* Scheduler view if not booked */
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

        {selectedStepId === 5 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Evaluación Académica 2027</h3>
              <p className="text-xs text-slate-500">
                Paso obligatorio para los niveles de Primaria y Secundaria. Permite registrar y evaluar el rendimiento en las materias de Matemáticas, Lenguaje y Aptitud.
              </p>
            </div>

            {!gradeRequiresEvaluation(grade) ? (
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase">Evaluación no Requerida para Inicial</h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    El grado solicitado es <strong>{grade}</strong> (Nivel {level}). Según los lineamientos escolares del colegio Juventud Científica, los postulantes de nivel Inicial no rinden examen de conocimientos escritos. Su proceso de admisión avanza directamente a la fase final tras la cita psicopedagógica familiar.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStepId(6)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-6 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Continuar al Estado Final
                </button>
              </div>
            ) : currentUser.academicEvaluation ? (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                      currentUser.academicEvaluationApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentUser.academicEvaluationApproved ? 'Evaluación Académica Aprobada' : 'Examen Programado'}
                    </span>
                    <h4 className="text-base font-black text-slate-950 uppercase">
                      Sábado {currentUser.academicEvaluation.dateLabel} a las {currentUser.academicEvaluation.timeSlot}
                    </h4>
                    <p className="text-xs text-slate-600 leading-normal">
                      {currentUser.academicEvaluationApproved
                        ? `¡Excelente! Se ha verificado el rendimiento académico en nuestro sistema. El postulante superó con éxito las evaluaciones y su estado académico ha sido marcado como APROBADO.`
                        : `El examen de conocimientos del postulante se encuentra agendado en el sistema. Por favor asista de forma puntual con sus útiles (lápiz, borrador, tajador) en el pabellón de exámenes correspondientes.`}
                    </p>
                  </div>
                </div>

                {!currentUser.academicEvaluationApproved && (
                  <button
                    onClick={handleCancelAcademicEvaluation}
                    className="w-full md:w-auto px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101 active:scale-95 animate-fade-in"
                  >
                    <X className="w-4 h-4" />
                    Cancelar y Reprogramar
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Date Panel */}
                  <div className="space-y-4 md:col-span-1">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">1. Seleccionar Sábado</h4>
                    
                    <div className="space-y-2">
                      {evalSaturdays.length === 0 ? (
                        <p className="text-xs text-slate-400">Calculando fechas hábiles...</p>
                      ) : (
                        evalSaturdays.map((sat) => (
                          <button
                            key={sat.key}
                            onClick={() => setSelectedEvalDate(sat.key)}
                            className={`w-full text-left p-3.5 rounded-2xl border transition duration-100 flex justify-between items-center cursor-pointer ${
                              selectedEvalDate === sat.key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100 scale-102 font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="block text-xs font-bold leading-tight">{sat.label}</span>
                              <span className={`block text-[9px] font-bold uppercase ${
                                selectedEvalDate === sat.key ? 'text-blue-200' : 'text-slate-400'
                              }`}>
                                Sábado de Admisiones
                              </span>
                            </div>
                            <Calendar className={`w-4 h-4 ${selectedEvalDate === sat.key ? 'text-white' : 'text-slate-400'}`} />
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Time Panel */}
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      2. Horarios de Examen para el Sábado {evalSaturdays.find(s => s.key === selectedEvalDate)?.label || selectedEvalDate}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evalTimeSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => handleBookAcademicEvaluation(slot)}
                          className="p-4 rounded-2xl border bg-white border-slate-200 hover:border-blue-500 text-slate-800 hover:bg-blue-50/20 shadow-xs cursor-pointer hover:scale-101 active:scale-95 flex justify-between items-center transition"
                        >
                          <div className="space-y-1">
                            <span className="block text-xs font-extrabold">{slot}</span>
                            <span className="block text-[9px] font-bold text-blue-600 uppercase">
                              ✅ DISPONIBILIDAD ILIMITADA
                            </span>
                          </div>
                          <Clock className="w-4.5 h-4.5 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded-2xl text-[11px] leading-normal flex gap-2">
                  <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Lineamientos de Examen:</strong> Las evaluaciones académicas se rinden exclusivamente los sábados (dentro del límite de 30 días a partir de la finalización de la Ficha Técnica). No hay límite de aforo por turno. No olvide registrar su asistencia en el control de puerta al ingresar al local escolar.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStepId === 6 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Estado Final & Asignación de Aula</h3>
              <p className="text-xs text-slate-500">Último paso del proceso de admisión. Inscriba formalmente al alumno y reciba su asignación de aula.</p>
            </div>

            {/* Check requirements */}
            {(!isDocsComplete || 
              currentUser.paymentState !== 'paid' || 
              !currentUser.appointmentApproved || 
              (gradeRequiresEvaluation(grade) && !currentUser.academicEvaluationApproved)
            ) ? (
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase">Etapas Previas Pendientes de Aprobación</h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Para poder culminar con el Estado Final y la Matrícula del alumno, todas las etapas previas del flujo guiado deben estar en estado aprobado/completado por el personal del colegio.
                  </p>
                </div>

                {/* Subchecklist */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold text-left">
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDocsComplete ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>1. Documentos</span>
                    <span className="text-[10px] uppercase font-black">{isDocsComplete ? '✓' : '...' }</span>
                  </div>
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    currentUser.paymentState === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>2. Pago Derecho</span>
                    <span className="text-[10px] uppercase font-black">{currentUser.paymentState === 'paid' ? '✓' : '...' }</span>
                  </div>
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    currentUser.appointmentApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>3. Cita Psicop.</span>
                    <span className="text-[10px] uppercase font-black">{currentUser.appointmentApproved ? '✓' : '...' }</span>
                  </div>
                  {gradeRequiresEvaluation(grade) && (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      currentUser.academicEvaluationApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      <span>4. Eval. Académica</span>
                      <span className="text-[10px] uppercase font-black">{currentUser.academicEvaluationApproved ? '✓' : '...' }</span>
                    </div>
                  )}
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
                  <h4 className="text-base font-black text-slate-900 uppercase">¡Todos los requisitos validados!</h4>
                  <p className="text-xs text-slate-600 leading-normal">
                    La Comisión de Admisión del Colegio <strong>Juventud Científica</strong> ha validado con éxito todas las etapas guiadas del postulante. Haga clic en el botón de abajo para confirmar la matrícula oficial y reservar su vacante y aula.
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
