import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  CreditCard, 
  FileCheck2, 
  Calendar, 
  TrendingUp, 
  HelpCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  MapPin, 
  Check, 
  AlertCircle, 
  LogOut, 
  Plus, 
  X,
  Sparkles,
  Award,
  Pencil,
  School,
  GripVertical
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdmissionRecord, AuditLogEntry } from '../utils/seedData';
import { 
  DISTRITOS, 
  SEDES_POR_DISTRITO, 
  GRADOS_INGRESO, 
  NIVELES_EDUCATIVOS,
  GradoOption
} from '../data';

interface AdminDashboardViewProps {
  records: AdmissionRecord[];
  onSaveRecord: (record: AdmissionRecord) => void;
  onLogout: () => void;
  triggerToast: (msg: string) => void;
  
  // Dynamic Districts, Headquarters, Grades & Levels props
  dynamicDistritos: string[];
  setDynamicDistritos: (list: string[]) => void;
  dynamicSedesMap: Record<string, string[]>;
  setDynamicSedesMap: (map: Record<string, string[]>) => void;
  dynamicGrados: GradoOption[];
  setDynamicGrados: (list: GradoOption[]) => void;
  sedeLevels: Record<string, string[]>;
  setSedeLevels: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  sedeAddresses: Record<string, string>;
  setSedeAddresses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function AdminDashboardView({ 
  records, 
  onSaveRecord, 
  onLogout, 
  triggerToast,
  dynamicDistritos,
  setDynamicDistritos,
  dynamicSedesMap,
  setDynamicSedesMap,
  dynamicGrados,
  setDynamicGrados,
  sedeLevels,
  setSedeLevels,
  sedeAddresses,
  setSedeAddresses
}: AdminDashboardViewProps) {
  // Navigation tabs within Admin Dashboard
  const [activeTab, setActiveTab] = useState<'applicants' | 'appointments' | 'users' | 'branches_districts' | 'reports'>('applicants');

  // Drag and drop states for columns
  const [draggedDistrictIndex, setDraggedDistrictIndex] = useState<number | null>(null);
  const [draggedSedeIndex, setDraggedSedeIndex] = useState<number | null>(null);
  const [draggedGradeIndex, setDraggedGradeIndex] = useState<number | null>(null);

  // CRUD States for Districts, Headquarters and Grades
  const [newDistrictName, setNewDistrictName] = useState('');
  const [editingDistrictName, setEditingDistrictName] = useState<string | null>(null);
  const [editingDistrictValue, setEditingDistrictValue] = useState('');

  const [selectedConfigDistrict, setSelectedConfigDistrict] = useState<string>('');
  const [newSedeName, setNewSedeName] = useState('');
  const [editingSedeName, setEditingSedeName] = useState<string | null>(null);
  const [editingSedeValue, setEditingSedeValue] = useState('');

  const [selectedConfigLevel, setSelectedConfigLevel] = useState<string>(NIVELES_EDUCATIVOS[0]);
  const [newGradeLabel, setNewGradeLabel] = useState('');
  const [editingGradeValue, setEditingGradeValue] = useState<string | null>(null);
  const [editingGradeLabel, setEditingGradeLabel] = useState('');

  // Default selection triggers
  useEffect(() => {
    if (dynamicDistritos.length > 0 && (!selectedConfigDistrict || !dynamicDistritos.includes(selectedConfigDistrict))) {
      setSelectedConfigDistrict(dynamicDistritos[0]);
    }
  }, [dynamicDistritos, selectedConfigDistrict]);

  // Handler functions for Districts
  const handleAddDistrict = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDistrictName.trim();
    if (!name) return;
    if (dynamicDistritos.some(d => d.toLowerCase() === name.toLowerCase())) {
      triggerToast("⚠️ Este distrito ya existe.");
      return;
    }
    setDynamicDistritos([...dynamicDistritos, name]);
    setDynamicSedesMap({
      ...dynamicSedesMap,
      [name]: []
    });
    setNewDistrictName('');
    triggerToast(`🟢 Distrito "${name}" agregado correctamente.`);
  };

  const handleSaveEditDistrict = (oldName: string) => {
    const newName = editingDistrictValue.trim();
    if (!newName) return;
    if (newName === oldName) {
      setEditingDistrictName(null);
      return;
    }
    if (dynamicDistritos.some(d => d.toLowerCase() === newName.toLowerCase() && d !== oldName)) {
      triggerToast("⚠️ Ya existe otro distrito con ese nombre.");
      return;
    }

    const updatedDistritos = dynamicDistritos.map(d => d === oldName ? newName : d);
    setDynamicDistritos(updatedDistritos);

    const updatedSedesMap = { ...dynamicSedesMap };
    updatedSedesMap[newName] = updatedSedesMap[oldName] || [];
    delete updatedSedesMap[oldName];
    setDynamicSedesMap(updatedSedesMap);

    if (selectedConfigDistrict === oldName) {
      setSelectedConfigDistrict(newName);
    }

    records.forEach(rec => {
      let changed = false;
      const formStateCopy = { ...rec.formState };
      if (formStateCopy.postulacion.distritoPostulacion === oldName) {
        formStateCopy.postulacion.distritoPostulacion = newName;
        changed = true;
      }
      if (formStateCopy.fichaFamilia?.distrito === oldName) {
        formStateCopy.fichaFamilia.distrito = newName;
        changed = true;
      }
      if (changed) {
        onSaveRecord({ ...rec, formState: formStateCopy });
      }
    });

    setEditingDistrictName(null);
    triggerToast(`🟢 Distrito actualizado.`);
  };

  const handleDeleteDistrict = (name: string) => {
    const hasApplicants = records.some(r => r.formState.postulacion.distritoPostulacion === name);
    const hasSedes = (dynamicSedesMap[name] || []).length > 0;
    
    let confirmMsg = `¿Está seguro de eliminar el distrito "${name}"?`;
    if (hasSedes) {
      confirmMsg += `\n⚠️ ADVERTENCIA: Se eliminarán también todas las sedes asociadas a este distrito.`;
    }
    if (hasApplicants) {
      confirmMsg += `\n⚠️ ADVERTENCIA: Existen expedientes de postulación registrados en este distrito.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setDynamicDistritos(dynamicDistritos.filter(d => d !== name));

    const updatedSedesMap = { ...dynamicSedesMap };
    delete updatedSedesMap[name];
    setDynamicSedesMap(updatedSedesMap);

    triggerToast(`🗑️ Distrito "${name}" eliminado.`);
  };

  // Drag and Drop reordering handlers
  const handleDragOverDistrict = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedDistrictIndex === null || draggedDistrictIndex === index) return;

    const updated = [...dynamicDistritos];
    const [draggedItem] = updated.splice(draggedDistrictIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedDistrictIndex(index);
    setDynamicDistritos(updated);
  };

  const handleDragOverSede = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSedeIndex === null || draggedSedeIndex === index || !selectedConfigDistrict) return;

    const currentSedes = dynamicSedesMap[selectedConfigDistrict] || [];
    const updated = [...currentSedes];
    const [draggedItem] = updated.splice(draggedSedeIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedSedeIndex(index);
    setDynamicSedesMap({
      ...dynamicSedesMap,
      [selectedConfigDistrict]: updated
    });
  };

  const handleDragOverGrade = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedGradeIndex === null || draggedGradeIndex === index) return;

    const activeLevelGrades = dynamicGrados.filter(g => g.nivel === selectedConfigLevel);
    const updatedActive = [...activeLevelGrades];
    const [draggedItem] = updatedActive.splice(draggedGradeIndex, 1);
    updatedActive.splice(index, 0, draggedItem);

    setDraggedGradeIndex(index);

    let activeIdx = 0;
    const updatedAll = dynamicGrados.map(g => {
      if (g.nivel === selectedConfigLevel) {
        return updatedActive[activeIdx++];
      }
      return g;
    });

    setDynamicGrados(updatedAll);
  };

  // Handler functions for Sedes
  const handleAddSede = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSedeName.trim();
    if (!name || !selectedConfigDistrict) return;

    const currentSedes = dynamicSedesMap[selectedConfigDistrict] || [];
    if (currentSedes.some(s => s.toLowerCase() === name.toLowerCase())) {
      triggerToast("⚠️ Esta sede ya existe en este distrito.");
      return;
    }

    setDynamicSedesMap({
      ...dynamicSedesMap,
      [selectedConfigDistrict]: [...currentSedes, name]
    });

    setSedeCapacities(prev => ({ ...prev, [name]: 120 }));
    setSedeLevels(prev => ({ ...prev, [name]: [...NIVELES_EDUCATIVOS] }));
    setSedeAddresses(prev => ({ ...prev, [name]: `Sede ${name}, ${selectedConfigDistrict}` }));

    setNewSedeName('');
    triggerToast(`🟢 Sede "${name}" agregada a ${selectedConfigDistrict}.`);
  };

  const handleSaveEditSede = (oldName: string) => {
    const newName = editingSedeValue.trim();
    if (!newName || !selectedConfigDistrict) return;
    if (newName === oldName) {
      setEditingSedeName(null);
      return;
    }

    const currentSedes = dynamicSedesMap[selectedConfigDistrict] || [];
    if (currentSedes.some(s => s.toLowerCase() === newName.toLowerCase() && s !== oldName)) {
      triggerToast("⚠️ Ya existe otra sede con ese nombre en este distrito.");
      return;
    }

    const updatedSedes = currentSedes.map(s => s === oldName ? newName : s);
    setDynamicSedesMap({
      ...dynamicSedesMap,
      [selectedConfigDistrict]: updatedSedes
    });

    setSedeCapacities(prev => {
      const copy = { ...prev };
      copy[newName] = copy[oldName] ?? 120;
      delete copy[oldName];
      return copy;
    });

    setSedeLevels(prev => {
      const copy = { ...prev };
      copy[newName] = copy[oldName] ?? [...NIVELES_EDUCATIVOS];
      delete copy[oldName];
      return copy;
    });

    setSedeAddresses(prev => {
      const copy = { ...prev };
      copy[newName] = copy[oldName] ?? `Sede ${newName}, ${selectedConfigDistrict}`;
      delete copy[oldName];
      return copy;
    });

    records.forEach(rec => {
      if (rec.formState.postulacion.sedeLocal === oldName) {
        const formStateCopy = { ...rec.formState };
        formStateCopy.postulacion.sedeLocal = newName;
        onSaveRecord({ ...rec, formState: formStateCopy });
      }
    });

    setEditingSedeName(null);
    triggerToast(`🟢 Sede actualizada.`);
  };

  const handleDeleteSede = (name: string) => {
    if (!selectedConfigDistrict) return;
    const hasApplicants = records.some(r => r.formState.postulacion.sedeLocal === name);
    
    let confirmMsg = `¿Está seguro de eliminar la sede "${name}" del distrito "${selectedConfigDistrict}"?`;
    if (hasApplicants) {
      confirmMsg += `\n⚠️ ADVERTENCIA: Existen alumnos postulando a esta sede.`;
    }

    if (!window.confirm(confirmMsg)) return;

    const currentSedes = dynamicSedesMap[selectedConfigDistrict] || [];
    setDynamicSedesMap({
      ...dynamicSedesMap,
      [selectedConfigDistrict]: currentSedes.filter(s => s !== name)
    });

    setSedeCapacities(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });

    setSedeLevels(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });

    setSedeAddresses(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });

    triggerToast(`🗑️ Sede "${name}" eliminada.`);
  };

  // Handler functions for Grades
  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newGradeLabel.trim();
    if (!label || !selectedConfigLevel) return;

    const value = `${selectedConfigLevel} ${label}`;

    if (dynamicGrados.some(g => g.value.toLowerCase() === value.toLowerCase() || g.label.toLowerCase() === label.toLowerCase())) {
      triggerToast("⚠️ Este grado ya existe.");
      return;
    }

    const newGrade: GradoOption = {
      value,
      label,
      nivel: selectedConfigLevel
    };

    setDynamicGrados([...dynamicGrados, newGrade]);
    setNewGradeLabel('');
    triggerToast(`🟢 Grado "${label}" agregado.`);
  };

  const handleSaveEditGrade = (oldValue: string) => {
    const newLabel = editingGradeLabel.trim();
    if (!newLabel || !selectedConfigLevel) return;

    const updatedGrados = dynamicGrados.map(g => {
      if (g.value === oldValue) {
        return {
          ...g,
          label: newLabel
        };
      }
      return g;
    });

    setDynamicGrados(updatedGrados);
    setEditingGradeValue(null);
    triggerToast(`🟢 Grado actualizado.`);
  };

  const handleDeleteGrade = (value: string, label: string) => {
    const hasApplicants = records.some(r => r.formState.postulacion.gradoIngreso === value);
    let confirmMsg = `¿Está seguro de eliminar el grado "${label}"?`;
    if (hasApplicants) {
      confirmMsg += `\n⚠️ ADVERTENCIA: Existen expedientes registrados en este grado.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setDynamicGrados(dynamicGrados.filter(g => g.value !== value));
    triggerToast(`🗑️ Grado "${label}" eliminado.`);
  };

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');

  // Selected applicant for detailed modal view
  const [selectedApplicant, setSelectedApplicant] = useState<AdmissionRecord | null>(null);
  
  // Status changing state inside the detail modal
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState<string>('');

  // Selected headquarter for capacity & level management in config panel
  const [selectedManageSede, setSelectedManageSede] = useState<string>(() => {
    return Object.values(SEDES_POR_DISTRITO)[0]?.[0] || 'Cdra 7';
  });

  const handleUpdateSedeCapacity = (sede: string, delta: number) => {
    setSedeCapacities(prev => {
      const current = prev[sede] ?? 50;
      const next = Math.max(1, current + delta);
      triggerToast(`🟢 Aforo de ${sede} actualizado a ${next} vacantes.`);
      return { ...prev, [sede]: next };
    });
  };

  const handleSetSedeCapacityDirect = (sede: string, value: number) => {
    const next = Math.max(1, value);
    setSedeCapacities(prev => ({ ...prev, [sede]: next }));
    triggerToast(`🟢 Aforo de ${sede} establecido en ${next} vacantes.`);
  };

  const handleToggleSedeLevel = (sede: string, level: string) => {
    setSedeLevels(prev => {
      const currentLevels = prev[sede] || [];
      let nextLevels: string[];
      if (currentLevels.includes(level)) {
        nextLevels = currentLevels.filter(l => l !== level);
        triggerToast(`🔴 Nivel "${level}" retirado de la sede ${sede}.`);
      } else {
        nextLevels = [...currentLevels, level];
        triggerToast(`🟢 Nivel "${level}" autorizado en la sede ${sede}.`);
      }
      return { ...prev, [sede]: nextLevels };
    });
  };

  // Log action helper (audit log feature disabled as requested)
  const addAuditLog = (action: string, details: string, recordId?: string) => {
    // No-op to avoid breaking existing callers
  };

  // Capacity & Levels Setup per Sede (dynamic & persistent)
  const [sedeCapacities, setSedeCapacities] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem('jc_sede_capacities');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    const defaults: Record<string, number> = {};
    Object.values(SEDES_POR_DISTRITO).flat().forEach(sede => {
      defaults[sede] = 50; // default aforo of 50 per sede
    });
    return defaults;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('jc_sede_capacities', JSON.stringify(sedeCapacities));
    window.dispatchEvent(new Event('storage'));
  }, [sedeCapacities]);

  const TOTAL_VACANCIES_CAPACITY: number = (Object.values(sedeCapacities) as number[]).reduce((sum: number, cap: number): number => sum + cap, 0);

  // Filter Active (non-deleted) records vs Soft deleted ones
  const activeRecords = records.filter(r => !r.isDeleted);
  const deletedRecords = records.filter(r => r.isDeleted);

  // Compute metrics
  const countTotalApplicants = activeRecords.length;
  const countEnrolled = activeRecords.filter(r => r.status === 'enrolled').length;
  const countPaid = activeRecords.filter(r => r.paymentState === 'paid').length;
  const countDocsVerified = activeRecords.filter(r => r.status === 'documents_verified' || r.status === 'interview_scheduled' || r.status === 'interview_completed' || r.status === 'admitted' || r.status === 'enrolled').length;
  const countAppointments = activeRecords.filter(r => !!r.appointment).length;
  const totalRevenue = activeRecords
    .filter(r => r.paymentState === 'paid')
    .reduce((sum, r) => sum + (r.paymentAmount || 350), 0);
  
  const countWaitingList = activeRecords.filter(r => r.status === 'waiting_list').length;
  const countObserved = activeRecords.filter(r => r.status === 'observed').length;
  const remainingVacancies = Math.max(0, TOTAL_VACANCIES_CAPACITY - countEnrolled);

  // Filter applicants list based on criteria
  const filteredApplicants = activeRecords.filter(app => {
    const student = app.formState.personales;
    const fullName = `${student.nombres} ${student.apellidoPaterno} ${student.apellidoMaterno}`.toUpperCase();
    const dniStudent = student.numeroDocumento;
    const famCode = app.id.toUpperCase();
    const cleanSearch = searchTerm.toUpperCase().trim();

    // Text search (DNI, Name, Family code)
    const matchesSearch = !cleanSearch || 
      fullName.includes(cleanSearch) || 
      dniStudent.includes(cleanSearch) || 
      famCode.includes(cleanSearch);

    // Dropdowns
    const matchesSede = !filterSede || app.formState.postulacion.sedeLocal === filterSede;
    const matchesGrade = !filterGrade || app.formState.postulacion.gradoIngreso === filterGrade;
    const matchesStatus = !filterStatus || app.status === filterStatus;
    const matchesDistrict = !filterDistrict || app.formState.postulacion.distritoPostulacion === filterDistrict;

    return matchesSearch && matchesSede && matchesGrade && matchesStatus && matchesDistrict;
  });

  // Export Filtered Applicants to Excel (CSV with UTF-8 BOM)
  const exportToExcel = () => {
    if (filteredApplicants.length === 0) {
      triggerToast("⚠️ No hay postulantes para exportar con los filtros actuales.");
      return;
    }

    addAuditLog('Exportación de Datos', `Se exportaron ${filteredApplicants.length} expedientes a formato Excel (CSV).`);

    // Headers
    const headers = [
      'Código Expediente',
      'DNI Postulante',
      'Apellidos y Nombres Postulante',
      'Fecha Nacimiento',
      'Colegio Procedencia',
      'Grado de Ingreso',
      'Nivel Educativo',
      'Sede/Local',
      'Distrito Postulación',
      'Estado Proceso',
      'Apoderado',
      'Celular Contacto',
      'Correo Contacto',
      'Estado Pago',
      'Monto Abonado (S/.)',
      'Fecha Creación'
    ];

    const csvRows = [
      headers.join(';'), // Use semicolon for Latin Excel compatibility
      ...filteredApplicants.map(app => {
        const p = app.formState.personales;
        const apo = app.formState.padresTutores.apoderado;
        return [
          app.id,
          p.numeroDocumento,
          `"${p.apellidoPaterno} ${p.apellidoMaterno}, ${p.nombres}"`,
          p.fechaNacimiento,
          `"${p.colegioProcedencia || 'Ninguno'}"`,
          `"${app.formState.postulacion.gradoIngreso}"`,
          app.formState.postulacion.nivelEducativo,
          `"${app.formState.postulacion.sedeLocal}"`,
          app.formState.postulacion.distritoPostulacion,
          app.status.toUpperCase(),
          `"${apo.nombres} ${apo.apellidoPaterno}"`,
          apo.celularContacto,
          apo.correoElectronico,
          app.paymentState.toUpperCase(),
          app.paymentState === 'paid' ? app.paymentAmount : 0,
          new Date(app.createdAt).toLocaleDateString('es-PE')
        ].join(';');
      })
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expedientes_Admision_JC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast("🟢 Archivo Excel (CSV) descargado exitosamente.");
  };

  // Export Reports & Analytics to PDF
  const exportReportsPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    addAuditLog('Exportación de Datos', `Exportación de Reporte Estadístico de Admisión a formato PDF.`);

    // Colors
    const primaryColor = [30, 58, 138];
    const secondaryColor = [245, 158, 11];

    // Decorative top header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('I.E. JUVENTUD CIENTÍFICA', 15, 27);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('Reporte Gerencial & Métricas del Proceso de Admisión 2027', 15, 33);
    
    const formattedDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Fecha de Emisión: ${formattedDate}`, 15, 38);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 42, 195, 42);

    // --- Key Metrics Grid ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMEN DE MÉTRICAS GENERALES', 15, 50);

    // Boxes layout
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 54, 55, 22, 'F');
    doc.rect(75, 54, 55, 22, 'F');
    doc.rect(135, 54, 60, 22, 'F');

    // Box 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('POSTULANTES REGISTRADOS', 18, 60);
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${countTotalApplicants}`, 18, 69);

    // Box 2
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ALUMNOS MATRICULADOS', 78, 60);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // green
    doc.text(`${countEnrolled}`, 78, 69);

    // Box 3
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('INGRESOS RECAUDADOS', 138, 60);
    doc.setFontSize(14);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`S/. ${totalRevenue.toLocaleString('es-PE')}`, 138, 69);

    // --- Table of distribution ---
    let y = 88;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('ESTADO DE EXPEDIENTES EN TRÁMITE', 15, y);
    y += 5;

    // Draw summary status lines
    const statuses = [
      { label: 'Pendiente de Documentos', count: activeRecords.filter(r => r.status === 'documents_pending').length, color: 'Gris' },
      { label: 'Documentos por Verificar', count: activeRecords.filter(r => r.status === 'documents_submitted').length, color: 'Azul' },
      { label: 'Documentos Verificados', count: activeRecords.filter(r => r.status === 'documents_verified').length, color: 'Verde' },
      { label: 'Cita Psicológica Pendiente', count: activeRecords.filter(r => r.status === 'interview_scheduled').length, color: 'Ambar' },
      { label: 'Entrevista Completada', count: activeRecords.filter(r => r.status === 'interview_completed').length, color: 'Celeste' },
      { label: 'Admitido / Vacante Reservada', count: activeRecords.filter(r => r.status === 'admitted').length, color: 'Esmeralda' },
      { label: 'Matriculado con Aula', count: activeRecords.filter(r => r.status === 'enrolled').length, color: 'Azul Oscuro' },
      { label: 'Lista de Espera', count: countWaitingList, color: 'Naranja' },
      { label: 'Observado / Rechazado', count: countObserved, color: 'Rojo' }
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Estado del Trámite', 18, y + 4);
    doc.text('Cantidad', 120, y + 4);
    doc.text('Distribución (%)', 150, y + 4);

    doc.line(15, y, 195, y);
    doc.line(15, y + 6, 195, y + 6);
    y += 11;

    doc.setFont('helvetica', 'normal');
    statuses.forEach((s) => {
      const pct = countTotalApplicants > 0 ? ((s.count / countTotalApplicants) * 100).toFixed(1) : '0.0';
      doc.text(s.label, 18, y);
      doc.text(`${s.count}`, 120, y);
      doc.text(`${pct}%`, 150, y);
      
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 2.5, 195, y + 2.5);
      y += 6.5;
    });

    // Sede stats
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('DISTRIBUCIÓN POR SEDE ESCOLAR', 15, y);
    y += 5;

    const sedes = ['Castillo Las Lilas', 'Sede Los Portales', 'Sede Central'];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Sede / Local', 18, y + 4);
    doc.text('Postulantes', 120, y + 4);
    doc.text('Matriculados', 150, y + 4);

    doc.setDrawColor(148, 163, 184);
    doc.line(15, y, 195, y);
    doc.line(15, y + 6, 195, y + 6);
    y += 11;

    doc.setFont('helvetica', 'normal');
    sedes.forEach((sede) => {
      const countSedePost = activeRecords.filter(r => r.formState.postulacion.sedeLocal === sede).length;
      const countSedeMat = activeRecords.filter(r => r.formState.postulacion.sedeLocal === sede && r.status === 'enrolled').length;

      doc.text(sede, 18, y);
      doc.text(`${countSedePost}`, 120, y);
      doc.text(`${countSedeMat}`, 150, y);

      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 2.5, 195, y + 2.5);
      y += 6.5;
    });

    // Signature/Footer
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text('I.E. Juventud Científica - Admisiones Virtuales Privadas - Año Académico 2027', 105, 292, { align: 'center' });

    doc.save(`Reporte_Admision_JC_2027.pdf`);
    triggerToast("🟢 Reporte PDF descargado exitosamente.");
  };

  // Perform soft delete
  const handleDeleteApplicant = (app: AdmissionRecord) => {
    const confirmDelete = window.confirm(`¿Está seguro de eliminar el expediente de ${app.formState.personales.nombres} ${app.formState.personales.apellidoPaterno}?`);
    if (!confirmDelete) return;

    const updated: AdmissionRecord = {
      ...app,
      isDeleted: true
    };
    onSaveRecord(updated);
    addAuditLog('Eliminación de Postulante', `Se eliminó temporalmente el expediente del alumno ${app.formState.personales.nombres} ${app.formState.personales.apellidoPaterno}.`, app.id);
    setSelectedApplicant(null);
    triggerToast("🗑️ Registro enviado a la papelera (petición de eliminación registrada).");
  };

  // Perform restore of soft deleted record
  const handleRestoreApplicant = (app: AdmissionRecord) => {
    const updated: AdmissionRecord = {
      ...app,
      isDeleted: false
    };
    onSaveRecord(updated);
    addAuditLog('Restauración de Postulante', `Se restauró satisfactoriamente el expediente del alumno ${app.formState.personales.nombres} ${app.formState.personales.apellidoPaterno}.`, app.id);
    triggerToast("🔄 Registro restaurado con éxito a la lista principal.");
  };

  // Save the modified status of an applicant
  const handleSaveStatusChange = () => {
    if (!selectedApplicant) return;

    const oldStatus = selectedApplicant.status;
    const newStatus = tempStatus as any;

    let assignedClassroomValue = selectedApplicant.assignedClassroom;
    let paymentStateValue = selectedApplicant.paymentState;
    let paymentAmountValue = selectedApplicant.paymentAmount;

    // Auto-setup properties if transition to certain states occurs
    if (newStatus === 'enrolled') {
      paymentStateValue = 'paid';
      paymentAmountValue = 350;
      if (!assignedClassroomValue) {
        // Auto assign a classroom based on grade
        const level = selectedApplicant.formState.postulacion.nivelEducativo;
        assignedClassroomValue = `Pabellón ${level === 'Inicial' ? 'A' : level === 'Primaria' ? 'B' : 'C'} - Aula ${Math.floor(101 + Math.random() * 5)}`;
      }
    } else if (newStatus === 'documents_pending') {
      paymentStateValue = 'pending';
    }

    const updated: AdmissionRecord = {
      ...selectedApplicant,
      status: newStatus,
      paymentState: paymentStateValue,
      paymentAmount: paymentAmountValue,
      assignedClassroom: assignedClassroomValue
    };

    onSaveRecord(updated);
    addAuditLog(
      'Modificación de Estado', 
      `Estado actualizado de [${oldStatus}] a [${newStatus}] para el expediente ${selectedApplicant.formState.personales.nombres} ${selectedApplicant.formState.personales.apellidoPaterno}.`, 
      selectedApplicant.id
    );

    setSelectedApplicant(updated);
    setIsChangingStatus(false);
    triggerToast("✨ Estado de postulación actualizado y guardado.");
  };

  // Human friendly label for statuses
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'documents_pending': return { text: 'Pte. Documentos', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'documents_submitted': return { text: 'Doc. Recibidos', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'documents_verified': return { text: 'Doc. Verificados', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'interview_scheduled': return { text: 'Cita Psicopedagógica', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'interview_completed': return { text: 'Entrevista Hecha', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      case 'admitted': return { text: 'Admitido (Vacante Reservada)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold' };
      case 'enrolled': return { text: 'Matriculado con Aula', bg: 'bg-green-600 text-white border-green-700 font-black' };
      case 'observed': return { text: 'Con Observaciones', bg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
      case 'waiting_list': return { text: 'Lista de Espera', bg: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold' };
      default: return { text: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Sidebar Menu */}
        <aside className="lg:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-6 lg:sticky lg:top-6">
          {/* Header/Brand info */}
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-brand-navy text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-blue" />
                Admin Maestro
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                I.E. Juventud Científica
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Admisiones Virtuales 2027
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2 mb-2">
              Menú de Control
            </span>
            
            <button
              onClick={() => setActiveTab('applicants')}
              className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'applicants'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Gestión Postulantes</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'applicants' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countTotalApplicants}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Reportes & Vacantes</span>
            </button>

            <button
              onClick={() => setActiveTab('branches_districts')}
              className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'branches_districts'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <School className="w-4 h-4 shrink-0" />
              <span>Distritos, Sedes y Grados</span>
            </button>


          </div>

          {/* Capacity Progress widget inside sidebar */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2">
              Estado de Matrícula
            </span>
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Matriculados:</span>
                <strong className="text-green-700 font-extrabold">{countEnrolled}</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Vacantes Libres:</span>
                <strong className="text-brand-navy font-extrabold">{remainingVacancies}</strong>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="bg-green-600 h-full transition-all duration-500"
                  style={{ width: `${(countEnrolled / TOTAL_VACANCIES_CAPACITY) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Actions & Exit at bottom of sidebar */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full bg-slate-950 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Active tab layout, info and action buttons */}
        <main className="lg:col-span-9 space-y-6">
          {/* Top Bar with actions */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Admisión 2027
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                {activeTab === 'applicants' && "Gestión de Expedientes"}
                {activeTab === 'reports' && "Reportes & Distribución Geográfica"}
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl">
                {activeTab === 'applicants' && "Supervise las fichas de postulación, verifique los documentos cargados, gestione citas psicopedagógicas y asigne vacantes oficiales."}
                {activeTab === 'reports' && "Métricas de matrícula, distribución geográfica por distritos, y estado financiero de recaudación por derecho de admisión."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={exportReportsPDF}
                className="flex-1 md:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold py-2 px-3.5 rounded-xl transition text-xs border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Reporte PDF</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 md:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold py-2 px-3.5 rounded-xl transition text-xs border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Postulantes */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Postulantes</span>
                <strong className="block text-xl font-black text-slate-900">{countTotalApplicants}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Registrados Totales</span>
              </div>
            </div>

            {/* Metric 2: Matriculados */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-green-50 text-green-700 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Matriculados</span>
                <strong className="block text-xl font-black text-green-700">{countEnrolled}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Vacantes Asignadas</span>
              </div>
            </div>

            {/* Metric 3: Ingresos Totales */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ingresos</span>
                <strong className="block text-xl font-black text-amber-700">S/. {totalRevenue.toLocaleString('es-PE')}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">{countPaid} Pagos Registrados</span>
              </div>
            </div>

            {/* Metric 4: Vacantes Libres */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vacantes</span>
                <strong className="block text-xl font-black text-blue-900">{remainingVacancies} / {TOTAL_VACANCIES_CAPACITY}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Disponibilidad Actual</span>
              </div>
            </div>

            {/* Metric 5: Citas Programadas */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Citas Psicología</span>
                <strong className="block text-xl font-black text-slate-900">{countAppointments}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Agendadas Virtuales</span>
              </div>
            </div>

            {/* Metric 6: Expedientes con Documentos */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Documentación</span>
                <strong className="block text-xl font-black text-slate-900">{countDocsVerified}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Expedientes Validados</span>
              </div>
            </div>

            {/* Metric 7: Lista de Espera */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-orange-50 text-orange-700 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lista de Espera</span>
                <strong className="block text-xl font-black text-orange-700">{countWaitingList}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Postulaciones en Fila</span>
              </div>
            </div>

            {/* Metric 8: Observados */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200">
              <div className="p-3 bg-red-50 text-red-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Observados</span>
                <strong className="block text-xl font-black text-red-700">{countObserved}</strong>
                <span className="text-[9px] text-slate-500 font-semibold block">Fichas con Errores</span>
              </div>
            </div>
          </div>

          {/* Tab content area */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {/* TAB 1: GESTION DE APICANTES */}
              {activeTab === 'applicants' && (
                <motion.div
                  key="applicants"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
            >
              {/* Search and Filters panel */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm uppercase tracking-wider">
                  <Filter className="w-4 h-4 text-blue-900" />
                  <span>Búsqueda Avanzada y Filtros Rápidos</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* Text search input */}
                  <div className="relative md:col-span-2">
                    <input
                      type="text"
                      placeholder="Buscar por DNI, Nombres o Código de Familia..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Distrito Select */}
                  <select
                    value={filterDistrict}
                    onChange={(e) => {
                      setFilterDistrict(e.target.value);
                      setFilterSede(''); // reset sede when district changes
                    }}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">-- Distrito (Todos) --</option>
                    {dynamicDistritos.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Sede Select */}
                  <select
                    value={filterSede}
                    onChange={(e) => setFilterSede(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">-- Sede / Local (Todas) --</option>
                    {filterDistrict ? (
                      (dynamicSedesMap[filterDistrict] || []).map(sede => (
                        <option key={sede} value={sede}>{sede}</option>
                      ))
                    ) : (
                      Object.values(dynamicSedesMap).flat().map(sede => (
                        <option key={sede} value={sede}>{sede}</option>
                      ))
                    )}
                  </select>

                  {/* Grade Select */}
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">-- Grado (Todos) --</option>
                    {dynamicGrados.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>

                  {/* Status Select */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">-- Estado Proceso (Todos) --</option>
                    <option value="documents_pending">Pte. Documentos</option>
                    <option value="documents_submitted">Documentos Recibidos</option>
                    <option value="documents_verified">Documentos Verificados</option>
                    <option value="interview_scheduled">Cita Programada</option>
                    <option value="interview_completed">Entrevista Hecha</option>
                    <option value="admitted">Admitido</option>
                    <option value="enrolled">Matriculado</option>
                    <option value="observed">Observado</option>
                    <option value="waiting_list">Lista de Espera</option>
                  </select>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 font-semibold">
                    Mostrando <strong className="text-blue-900 font-extrabold">{filteredApplicants.length}</strong> de <strong className="text-slate-800">{activeRecords.length}</strong> expedientes activos.
                  </span>
                  
                  {(searchTerm || filterSede || filterGrade || filterStatus || filterDistrict) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterSede('');
                        setFilterGrade('');
                        setFilterStatus('');
                        setFilterDistrict('');
                      }}
                      className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Applicants Table Grid */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Expediente / Familia</th>
                        <th className="py-3.5 px-4 font-bold">Postulante / DNI</th>
                        <th className="py-3.5 px-4 font-bold">Sede & Grado</th>
                        <th className="py-3.5 px-4 font-bold">Estado Proceso</th>
                        <th className="py-3.5 px-4 font-bold">Pago Matrícula</th>
                        <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredApplicants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            Ningún expediente coincide con los criterios de búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredApplicants.map((app) => {
                          const p = app.formState.personales;
                          const apo = app.formState.padresTutores.apoderado;
                          const stLabel = getStatusLabel(app.status);
                          return (
                            <tr key={app.id} className="hover:bg-slate-50/70 transition duration-150">
                              <td className="py-4 px-4">
                                <span className="block font-black text-slate-900 tracking-tight text-xs">{app.id}</span>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                  {app.formState.fichaFamilia?.nombreFamilia || `Familiar ${p.apellidoPaterno}`}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="block font-extrabold text-slate-800 uppercase">
                                  {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">DNI: {p.numeroDocumento}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="block font-bold text-slate-700">{app.formState.postulacion.gradoIngreso}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {app.formState.postulacion.sedeLocal}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full border ${stLabel.bg}`}>
                                  {stLabel.text}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {app.paymentState === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                    PAGADO (S/. {app.paymentAmount || 350})
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedApplicant(app);
                                      setTempStatus(app.status);
                                      setIsChangingStatus(false);
                                    }}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer"
                                  >
                                    Ver Detalle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApplicant(app)}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold p-1.5 rounded-lg text-[10px] transition cursor-pointer"
                                    title="Eliminar Expediente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Papelera de Restauración - Integrada elegantemente en Gestión de Expedientes */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Papelera de Restauración ({deletedRecords.length})</span>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-900 font-black px-2.5 py-0.5 rounded-full">
                    Expedientes Eliminados
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A continuación se listan los postulantes retirados temporalmente de la lista principal. Puede restaurar un expediente en cualquier momento.
                </p>

                <div className="border border-red-100 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-red-50/50 border-b border-red-100 text-red-900 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4 font-bold">Código Familia</th>
                          <th className="py-2.5 px-4 font-bold">Postulante</th>
                          <th className="py-2.5 px-4 font-bold">Grado & Sede</th>
                          <th className="py-2.5 px-4 font-bold text-right">Acción de Restauración</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50">
                        {deletedRecords.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                              No hay expedientes eliminados en la papelera temporal.
                            </td>
                          </tr>
                        ) : (
                          deletedRecords.map((app) => {
                            const p = app.formState.personales;
                            return (
                              <tr key={app.id} className="hover:bg-red-50/20">
                                <td className="py-3 px-4 font-bold text-red-900">{app.id}</td>
                                <td className="py-3 px-4 uppercase font-bold text-slate-800">
                                  {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {app.formState.postulacion.gradoIngreso} ({app.formState.postulacion.sedeLocal})
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleRestoreApplicant(app)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition flex items-center justify-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Restaurar Expediente</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: REPORTES Y ESTADISTICAS */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Distribution by Grade */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Distribución por Grado de Ingreso
                  </h4>
                  <span className="text-[10px] bg-blue-50 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full">
                    Aulas 2027
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {GRADOS_INGRESO.map(grade => {
                    const totalInGrade = activeRecords.filter(r => r.formState.postulacion.gradoIngreso === grade.value).length;
                    const enrolledInGrade = activeRecords.filter(r => r.formState.postulacion.gradoIngreso === grade.value && r.status === 'enrolled').length;
                    const percentage = countTotalApplicants > 0 ? (totalInGrade / countTotalApplicants) * 100 : 0;

                    return (
                      <div key={grade.value} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">{grade.label}</span>
                          <span className="font-semibold text-slate-500">
                            {totalInGrade} Postulantes ({enrolledInGrade} Mat.)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-blue-900 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(3, percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sede & Distrito Distribution Reports */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Demografía y Geolocalización (Distritos)
                  </h4>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                    Sedes Activas
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Sede Local cards with details (Scrollable list of all sedes) */}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ocupación de Vacantes por Sede</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {Object.keys(sedeCapacities).map(sede => {
                      const countPost = activeRecords.filter(r => r.formState.postulacion.sedeLocal === sede).length;
                      const countMat = activeRecords.filter(r => r.formState.postulacion.sedeLocal === sede && r.status === 'enrolled').length;
                      const limit = sedeCapacities[sede] || 50;
                      return (
                        <div key={sede} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 hover:shadow-2xs transition">
                          <span className="block text-[10px] text-slate-600 font-black uppercase tracking-wider truncate" title={sede}>{sede}</span>
                          <strong className="block text-sm font-black text-slate-900">{countPost} <span className="text-[9px] text-slate-400 font-normal">post.</span></strong>
                          <span className="text-[8px] bg-green-50 text-green-800 px-1.5 py-0.5 rounded-full font-bold border border-green-100 inline-block">
                            {countMat} / {limit} Mat.
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* District table */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Procedencia por Distritos</span>
                    <div className="border border-slate-150 rounded-xl overflow-hidden text-xs">
                      <div className="grid grid-cols-3 bg-slate-50 p-2.5 font-bold text-slate-600 border-b">
                        <span>Distrito</span>
                        <span className="text-center">Postulantes</span>
                        <span className="text-right">Porcentaje</span>
                      </div>
                      {DISTRITOS.map(dist => {
                        const countD = activeRecords.filter(r => r.formState.postulacion.distritoPostulacion === dist || r.formState.fichaFamilia?.distrito === dist).length;
                        const pctD = countTotalApplicants > 0 ? ((countD / countTotalApplicants) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={dist} className="grid grid-cols-3 p-2 border-b last:border-b-0 hover:bg-slate-50">
                            <span className="font-semibold text-slate-700">{dist}</span>
                            <span className="text-center font-bold text-slate-900">{countD}</span>
                            <span className="text-right font-mono text-slate-500">{pctD}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* GESTIÓN DE SEDES: AFOROS Y NIVELES AUTORIZADOS */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-950 rounded-xl">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Control de Aforos y Niveles de Enseñanza por Sede
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Agregue/quite vacantes autorizadas y habilite/restrinja niveles educativos permitidos por local escolar.
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] bg-blue-900 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    Panel del Administrador
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  {/* Select branch */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      1. Seleccione la Sede a Modificar:
                    </label>
                    <select
                      value={selectedManageSede}
                      onChange={(e) => setSelectedManageSede(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-700 font-extrabold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {Object.entries(dynamicSedesMap).map(([dist, sedes]) => (
                        <optgroup key={dist} label={dist.toUpperCase()}>
                          {sedes.map(sede => (
                            <option key={sede} value={sede}>{sede} ({dist})</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2 mt-3 text-xs">
                      <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-wider">Estado en Tiempo Real:</h5>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Postulantes totales:</span>
                        <strong className="text-slate-800 font-black">
                          {activeRecords.filter(r => r.formState.postulacion.sedeLocal === selectedManageSede).length}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Matriculados finales:</span>
                        <strong className="text-green-700 font-black">
                          {activeRecords.filter(r => r.formState.postulacion.sedeLocal === selectedManageSede && r.status === 'enrolled').length}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t pt-1.5 mt-1">
                        <span className="text-slate-500 font-semibold">Aforo Configurado:</span>
                        <strong className="text-blue-900 font-black">
                          {sedeCapacities[selectedManageSede] || 50} vacantes
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Aforo / Capacity adjustment */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        2. Modificar Aforo (Límite Vacantes):
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Incremente o reduzca el cupo total autorizado para admisiones.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2.5 mt-2">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleUpdateSedeCapacity(selectedManageSede, -5)}
                          className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg border border-slate-200 transition text-[10px] shadow-2xs cursor-pointer"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleUpdateSedeCapacity(selectedManageSede, -1)}
                          className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg border border-slate-200 transition text-[10px] shadow-2xs cursor-pointer"
                        >
                          -1
                        </button>
                      </div>

                      <div className="text-center flex-1 bg-white border border-slate-300 rounded-2xl p-2 shadow-inner">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Límite</span>
                        <input
                          type="number"
                          value={sedeCapacities[selectedManageSede] || 50}
                          onChange={(e) => handleSetSedeCapacityDirect(selectedManageSede, parseInt(e.target.value) || 1)}
                          className="w-full text-center font-black text-xl text-slate-900 focus:outline-hidden"
                          min="1"
                          max="500"
                        />
                        <span className="block text-[8px] font-extrabold text-blue-900">Vacantes</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleUpdateSedeCapacity(selectedManageSede, 1)}
                          className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg border border-slate-200 transition text-[10px] shadow-2xs cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleUpdateSedeCapacity(selectedManageSede, 5)}
                          className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg border border-slate-200 transition text-[10px] shadow-2xs cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <div className="text-center border-t border-slate-200 pt-2 text-[9px] uppercase font-bold text-slate-400">
                      Capacidad total estimada para ingresos
                    </div>
                  </div>

                  {/* Level authorization */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        3. Autorizar / Retirar Niveles:
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Añada o quite niveles autorizados para matrículas en esta sede.
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                      {NIVELES_EDUCATIVOS.map(level => {
                        const isAuthorized = (sedeLevels[selectedManageSede] || []).includes(level);
                        return (
                          <div 
                            key={level} 
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-150 hover:bg-white hover:shadow-2xs transition"
                          >
                            <span className={`text-xs font-bold ${isAuthorized ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                              {level}
                            </span>
                            
                            <button
                              onClick={() => handleToggleSedeLevel(selectedManageSede, level)}
                              className={`py-1 px-3 rounded-lg text-[9px] font-black transition cursor-pointer border ${
                                isAuthorized 
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isAuthorized ? 'Quitar' : 'Agregar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dirección de la Sede */}
                  <div className="space-y-3 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-black text-blue-700 uppercase tracking-wider">
                        4. Dirección de la Sede / Local:
                      </label>
                      <p className="text-[11px] text-blue-500/85 mt-0.5">
                        Establezca la dirección física oficial de este local.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={sedeAddresses[selectedManageSede] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSedeAddresses(prev => ({
                            ...prev,
                            [selectedManageSede]: val
                          }));
                        }}
                        placeholder="Ej: Av. Principal N° 123, Distrito"
                        className="w-full text-xs rounded-xl border border-blue-200 p-2.5 bg-white text-slate-800 font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden resize-none"
                      />
                      <div className="text-[9px] text-blue-500 font-extrabold uppercase tracking-wider text-right">
                        Sincronización en Vivo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: GESTIÓN DE DISTRITOS, SEDES Y GRADOS */}
          {activeTab === 'branches_districts' && (
            <motion.div
              key="branches_districts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Top description banner */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Configuración del Sistema
                  </span>
                  <h3 className="text-lg font-black tracking-tight">Gestión de Estructura Educativa</h3>
                  <p className="text-xs text-slate-300">
                    Administre los distritos, sedes y grados disponibles para el formulario de postulación de padres de familia.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="p-3 bg-slate-800 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-amber-400">{dynamicDistritos.length}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Distritos</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-blue-400">
                      {Object.values(dynamicSedesMap).flat().length}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sedes</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-emerald-400">{dynamicGrados.length}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Grados</span>
                  </div>
                </div>
              </div>

              {/* Three Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLUMN 1: DISTRITOS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        1. Distritos de Admisión
                      </h4>
                      <p className="text-[10px] text-slate-400">Distritos territoriales del colegio.</p>
                    </div>
                  </div>

                  {/* Add District Form */}
                  <form onSubmit={handleAddDistrict} className="mb-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo distrito..."
                      value={newDistrictName}
                      onChange={(e) => setNewDistrictName(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir
                    </button>
                  </form>

                  {/* District List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {dynamicDistritos.map((dist, index) => {
                      const sedesCount = (dynamicSedesMap[dist] || []).length;
                      const isEditing = editingDistrictName === dist;
                      const isSelected = selectedConfigDistrict === dist;
                      const isDragged = draggedDistrictIndex === index;

                      return (
                        <div
                          key={dist}
                          draggable={!isEditing}
                          onDragStart={() => setDraggedDistrictIndex(index)}
                          onDragOver={(e) => handleDragOverDistrict(e, index)}
                          onDragEnd={() => setDraggedDistrictIndex(null)}
                          onClick={() => !isEditing && setSelectedConfigDistrict(dist)}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50/50 border-blue-200 shadow-xs' 
                              : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/50'
                          } ${isDragged ? 'opacity-40 border-dashed border-blue-400' : ''}`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full mr-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingDistrictValue}
                                onChange={(e) => setEditingDistrictValue(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditDistrict(dist)}
                                className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                title="Guardar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDistrictName(null)}
                                className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 overflow-hidden mr-1">
                                <div 
                                  className="cursor-grab text-slate-400 hover:text-slate-600 p-0.5 shrink-0" 
                                  title="Arrastrar para ordenar"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{dist}</span>
                                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                                    {sedesCount} {sedesCount === 1 ? 'sede' : 'sedes'} asociadas
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDistrictName(dist);
                                    setEditingDistrictValue(dist);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-200/50 rounded-lg transition"
                                  title="Editar nombre"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDistrict(dist)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Eliminar distrito"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COLUMN 2: SEDES */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                      <School className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider truncate">
                        2. Sedes de {selectedConfigDistrict || '...'}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">Locales del distrito seleccionado.</p>
                    </div>
                  </div>

                  {selectedConfigDistrict ? (
                    <>
                      {/* Add Sede Form */}
                      <form onSubmit={handleAddSede} className="mb-4 flex gap-2">
                        <input
                          type="text"
                          placeholder="Nueva Sede..."
                          value={newSedeName}
                          onChange={(e) => setNewSedeName(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Añadir
                        </button>
                      </form>

                      {/* Sede List */}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                        {(dynamicSedesMap[selectedConfigDistrict] || []).length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-medium text-xs">
                            Ninguna sede registrada para este distrito. Agregue una arriba.
                          </div>
                        ) : (
                          (dynamicSedesMap[selectedConfigDistrict] || []).map((sede, index) => {
                            const isEditing = editingSedeName === sede;
                            const allowedLevels = sedeLevels[sede] || [];
                            const isDragged = draggedSedeIndex === index;

                            return (
                              <div
                                key={sede}
                                draggable={!isEditing}
                                onDragStart={() => setDraggedSedeIndex(index)}
                                onDragOver={(e) => handleDragOverSede(e, index)}
                                onDragEnd={() => setDraggedSedeIndex(null)}
                                className={`p-3 bg-slate-50/50 rounded-2xl border border-slate-150 transition space-y-2 ${isDragged ? 'opacity-40 border-dashed border-blue-400' : ''}`}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingSedeValue}
                                      onChange={(e) => setEditingSedeValue(e.target.value)}
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditSede(sede)}
                                      className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                      title="Guardar"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSedeName(null)}
                                      className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden mr-1">
                                      <div 
                                        className="cursor-grab text-slate-400 hover:text-slate-600 p-0.5 shrink-0" 
                                        title="Arrastrar para ordenar"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="space-y-0.5 min-w-0">
                                        <span className="text-xs font-bold text-slate-800 block truncate">{sede}</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                                          Capacidad: {sedeCapacities[sede] ?? 120} vacantes
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSedeName(sede);
                                          setEditingSedeValue(sede);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-200/50 rounded-lg transition"
                                        title="Editar nombre"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSede(sede)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Eliminar sede"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Authorized Levels badging and fast toggle inside this Sede */}
                                <div className="border-t border-slate-100 pt-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                                    Niveles Autorizados:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {NIVELES_EDUCATIVOS.map(lvl => {
                                      const isAuth = allowedLevels.includes(lvl);
                                      return (
                                        <button
                                          type="button"
                                          key={lvl}
                                          onClick={() => handleToggleSedeLevel(sede, lvl)}
                                          className={`px-2 py-0.5 rounded-md text-[9px] font-black border transition cursor-pointer ${
                                            isAuth 
                                              ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/70' 
                                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200/70'
                                          }`}
                                        >
                                          {lvl}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-semibold text-center p-6 bg-slate-50 rounded-2xl border border-dashed">
                      Seleccione o cree un distrito a la izquierda para administrar sus sedes.
                    </div>
                  )}
                </div>

                {/* COLUMN 3: GRADOS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        3. Grados por Nivel
                      </h4>
                      <p className="text-[10px] text-slate-400">Estructura curricular de admisión.</p>
                    </div>
                  </div>

                  {/* Level Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-[10px] font-bold font-sans">
                    {NIVELES_EDUCATIVOS.map(lvl => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => {
                          setSelectedConfigLevel(lvl);
                          setEditingGradeValue(null);
                        }}
                        className={`py-1.5 rounded-lg transition text-center cursor-pointer ${
                          selectedConfigLevel === lvl
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  {/* Add Grade Form */}
                  <form onSubmit={handleAddGrade} className="mb-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo grado (ej. 3er Año)..."
                      value={newGradeLabel}
                      onChange={(e) => setNewGradeLabel(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir
                    </button>
                  </form>

                  {/* Grade List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {dynamicGrados.filter(g => g.nivel === selectedConfigLevel).length === 0 ? (
                      <div className="py-12 text-center text-slate-400 font-medium text-xs">
                        Ningún grado registrado para el nivel "{selectedConfigLevel}". Agregue uno arriba.
                      </div>
                    ) : (
                      dynamicGrados.filter(g => g.nivel === selectedConfigLevel).map((grade, index) => {
                        const isEditing = editingGradeValue === grade.value;
                        const isDragged = draggedGradeIndex === index;

                        return (
                          <div
                            key={grade.value}
                            draggable={!isEditing}
                            onDragStart={() => setDraggedGradeIndex(index)}
                            onDragOver={(e) => handleDragOverGrade(e, index)}
                            onDragEnd={() => setDraggedGradeIndex(null)}
                            className={`p-3 bg-slate-50/50 rounded-2xl border border-slate-150 transition flex items-center justify-between ${isDragged ? 'opacity-40 border-dashed border-blue-400' : ''}`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  type="text"
                                  value={editingGradeLabel}
                                  onChange={(e) => setEditingGradeLabel(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditGrade(grade.value)}
                                  className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                  title="Guardar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGradeValue(null)}
                                  className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 overflow-hidden mr-1">
                                  <div 
                                    className="cursor-grab text-slate-400 hover:text-slate-600 p-0.5 shrink-0" 
                                    title="Arrastrar para ordenar"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="text-xs font-bold text-slate-800 block truncate">{grade.label}</span>
                                    <span className="text-[10px] text-slate-400 font-medium block truncate">
                                      Nivel: {grade.nivel}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGradeValue(grade.value);
                                      setEditingGradeLabel(grade.label);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-200/50 rounded-lg transition"
                                    title="Editar etiqueta"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteGrade(grade.value, grade.label)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Eliminar grado"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </main>
      </div>

      {/* APPLICANT DETAIL & STATE CONTROL MODAL */}
      <AnimatePresence>
        {selectedApplicant && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            >
              {/* Modal header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b-4 border-amber-500">
                <div>
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Expediente: {selectedApplicant.id}</span>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                    {selectedApplicant.formState.personales.apellidoPaterno} {selectedApplicant.formState.personales.apellidoMaterno}, {selectedApplicant.formState.personales.nombres}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal scrollable body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
                {/* 1. Status Section with Change Controls */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estado de Postulación Actual</span>
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
                        Cambiar Estado
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSaveStatusChange}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Guardar
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
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Seleccione el nuevo estado para este postulante:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
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
                          <label key={opt.val} className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer text-[11px] font-semibold text-slate-700">
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

                {/* 2. Candidate details and application info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Detalles de Postulación</h4>
                    <div className="space-y-1.5 text-xs">
                      <p><span className="text-slate-400 font-semibold">Grado de Ingreso:</span> <strong className="text-slate-800">{selectedApplicant.formState.postulacion.gradoIngreso}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Nivel Educativo:</span> <strong className="text-slate-800">{selectedApplicant.formState.postulacion.nivelEducativo}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Sede Escolar:</span> <strong className="text-slate-800">{selectedApplicant.formState.postulacion.sedeLocal}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Distrito Postulación:</span> <strong className="text-slate-800">{selectedApplicant.formState.postulacion.distritoPostulacion}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Turno Preferencia:</span> <strong className="text-slate-800">{selectedApplicant.formState.postulacion.turnoPreferencia}</strong></p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Detalles Personales</h4>
                    <div className="space-y-1.5 text-xs">
                      <p><span className="text-slate-400 font-semibold">Postulante:</span> <strong className="text-slate-800">{selectedApplicant.formState.personales.nombres} {selectedApplicant.formState.personales.apellidoPaterno}</strong></p>
                      <p><span className="text-slate-400 font-semibold">DNI Alumno:</span> <strong className="text-slate-800">{selectedApplicant.formState.personales.numeroDocumento}</strong></p>
                      <p><span className="text-slate-400 font-semibold">F. Nacimiento:</span> <strong className="text-slate-800">{selectedApplicant.formState.personales.fechaNacimiento}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Colegio Procedencia:</span> <strong className="text-slate-800">{selectedApplicant.formState.personales.colegioProcedencia || 'Ninguno'}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Vive con:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales.viveCon || 'Padres'}</strong></p>
                    </div>
                  </div>
                </div>

                {/* 3. Family / Apoderado info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Información Familiar y Apoderado Legal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      {(() => {
                        const apo = selectedApplicant.formState.padresTutores.apoderado;
                        return (
                          <>
                            <p><span className="text-slate-400 font-semibold">Apoderado:</span> <strong className="text-slate-800">{apo.nombres} {apo.apellidoPaterno} {apo.apellidoMaterno}</strong></p>
                            <p><span className="text-slate-400 font-semibold">DNI Apoderado:</span> <strong className="text-slate-800">{apo.numeroDocumento}</strong></p>
                            <p><span className="text-slate-400 font-semibold">Celular Contacto:</span> <strong className="text-slate-800">{apo.celularContacto}</strong></p>
                            <p><span className="text-slate-400 font-semibold">Correo Electrónico:</span> <strong className="text-slate-800">{apo.correoElectronico}</strong></p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="space-y-1.5">
                      <p><span className="text-slate-400 font-semibold">Nombre Familia:</span> <strong className="text-slate-800">{selectedApplicant.formState.fichaFamilia?.nombreFamilia || 'Pérez Luján'}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Dirección Familiar:</span> <strong className="text-slate-800">{selectedApplicant.formState.fichaFamilia?.direccionResidencia || 'Av. Los Próceres 124'}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Teléfono Fijo:</span> <strong className="text-slate-800">{selectedApplicant.formState.fichaFamilia?.telefonoContacto || 'Ninguno'}</strong></p>
                      <p><span className="text-slate-400 font-semibold">Ingresos Mensuales Papá:</span> <strong className="text-slate-800">{selectedApplicant.formState.padresTutores.papa.ingresosMensuales || 'N/A'}</strong></p>
                    </div>
                  </div>
                </div>

                {/* 4. Documents checklist */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Documentos Cargados</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      { key: 'dniPostulante', label: 'DNI Postulante' },
                      { key: 'dniApoderado', label: 'DNI Apoderado' },
                      { key: 'libretaEstudios', label: 'Libreta Notas' },
                      { key: 'constanciaNoAdeudo', label: 'No Adeudo' }
                    ].map(doc => {
                      const isUploaded = !!selectedApplicant.documents?.[doc.key as any];
                      const fileName = selectedApplicant.documents?.[doc.key as any];
                      return (
                        <div key={doc.key} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">{doc.label}</span>
                          {isUploaded ? (
                            <span className="text-[10px] text-green-700 font-black mt-1.5 break-all">
                              ✓ {fileName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              FALTA
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Classroom & Appointment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cita Psicopedagógica</span>
                    {selectedApplicant.appointment ? (
                      <div className="pt-1.5 space-y-0.5">
                        <p className="font-bold text-slate-800">Fecha: {selectedApplicant.appointment.date}</p>
                        <p className="text-slate-600">Hora: {selectedApplicant.appointment.time}</p>
                        <p className="text-slate-400">Psicólogo: {selectedApplicant.appointment.psychologist || 'Por designar'}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic pt-1">No agendada todavía por el apoderado.</p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pabellón & Aula Asignada</span>
                    {selectedApplicant.assignedClassroom ? (
                      <p className="font-black text-green-700 text-sm pt-1 bg-green-50 px-2 py-1.5 rounded-lg border border-green-200 mt-1 inline-block">
                        {selectedApplicant.assignedClassroom}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic pt-1.5">No asignada (aula se genera tras la matrícula).</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal footer actions */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
