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
  GripVertical,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdmissionRecord, AuditLogEntry } from '../utils/seedData';
import UsersManagementView from './UsersManagementView';
import { 
  DISTRITOS, 
  SEDES_POR_DISTRITO, 
  GRADOS_INGRESO, 
  NIVELES_EDUCATIVOS,
  GradoOption
} from '../data';

interface DniDocument {
  frontal: string | null;
  posterior: string | null;
}

function parseDniValue(val: string | null): DniDocument {
  if (!val) {
    return { frontal: null, posterior: null };
  }
  if (val.trim().startsWith('{')) {
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

function requiresGoodConduct(gradeName: string): boolean {
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
}

interface AdminDashboardViewProps {
  currentUser: any;
  records: AdmissionRecord[];
  onSaveRecord: (record: AdmissionRecord) => void;
  onLogout: () => void;
  triggerToast: (msg: string) => void;
  onDeleteRecord?: (id: string) => void;
  onClearRecords?: () => void;
  onRestoreDemoRecords?: () => void;
  
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

  // Admission Fee config
  admissionFee: number;
  setAdmissionFee: (fee: number) => void;
  admissionFeeActive: boolean;
  setAdmissionFeeActive: (active: boolean) => void;
}

export default function AdminDashboardView({ 
  currentUser,
  records, 
  onSaveRecord, 
  onLogout, 
  triggerToast,
  onDeleteRecord,
  onClearRecords,
  onRestoreDemoRecords,
  dynamicDistritos,
  setDynamicDistritos,
  dynamicSedesMap,
  setDynamicSedesMap,
  dynamicGrados,
  setDynamicGrados,
  sedeLevels,
  setSedeLevels,
  sedeAddresses,
  setSedeAddresses,
  admissionFee,
  setAdmissionFee,
  admissionFeeActive,
  setAdmissionFeeActive
}: AdminDashboardViewProps) {
  // Helper to check if a permission is granted
  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleAdmin === 'Super Administrador' || currentUser.id === 'ADMIN-MASTER' || currentUser.username === 'admin') {
      return true;
    }
    return currentUser.permissions?.includes(permission) || false;
  }, [currentUser]);

  const handleClearAllRecords = () => {
    setConfirmModal({
      isOpen: true,
      title: "Limpiar Base de Datos de Alumnos",
      message: "⚠️ ¡ATENCIÓN! Esta acción eliminará permanentemente TODOS los registros de alumnos/postulantes y reiniciará la base de datos a cero (0 alumnos).\n\n¿Está completamente seguro de continuar con esta operación irreversible?",
      onConfirm: () => {
        if (onClearRecords) {
          onClearRecords();
          triggerToast("🗑️ Base de datos de alumnos limpiada con éxito (0 alumnos).");
        }
      }
    });
  };

  const handleRestoreDemoRecords = () => {
    setConfirmModal({
      isOpen: true,
      title: "Restaurar Registros de Demostración",
      message: "🔄 Esta acción recargará el conjunto de datos de demostración de alumnos y familias en la base de datos local para fines de prueba.\n\n¿Desea continuar?",
      onConfirm: () => {
        if (onRestoreDemoRecords) {
          onRestoreDemoRecords();
          triggerToast("✨ Registros de demostración restaurados con éxito.");
        }
      }
    });
  };

  // Navigation tabs within Admin Dashboard
  const [activeTab, setActiveTab] = useState<'applicants' | 'appointments' | 'users' | 'branches_districts' | 'reports'>('applicants');

  // Visible metrics customization states
  const [isCustomizingDashboard, setIsCustomizingDashboard] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>(() => {
    const userKey = currentUser?.username || currentUser?.id || 'anonymous';
    const stored = localStorage.getItem(`jc_visible_metrics_${userKey}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return {
      total_applicants: true,
      pending_approval: true,
      ready_for_completion: true,
      documents_pending: true,
      documents_submitted: true,
      documents_verified: true,
      payments_pending: true,
      payments_approved: true,
      appointments_scheduled: true,
      appointments_completed: true,
      academic_scheduled: true,
      academic_completed: true,
      admitted: true,
      enrolled: true,
      waiting_list: true,
      observed: true,
      vacancies_available: true,
      vacancies_occupied: true,
      admission_revenue: true,
    };
  });

  // Reload custom metrics when user changes
  useEffect(() => {
    const userKey = currentUser?.username || currentUser?.id || 'anonymous';
    const stored = localStorage.getItem(`jc_visible_metrics_${userKey}`);
    if (stored) {
      try {
        setVisibleMetrics(JSON.parse(stored));
      } catch (e) {}
    } else {
      setVisibleMetrics({
        total_applicants: true,
        pending_approval: true,
        ready_for_completion: true,
        documents_pending: true,
        documents_submitted: true,
        documents_verified: true,
        payments_pending: true,
        payments_approved: true,
        appointments_scheduled: true,
        appointments_completed: true,
        academic_scheduled: true,
        academic_completed: true,
        admitted: true,
        enrolled: true,
        waiting_list: true,
        observed: true,
        vacancies_available: true,
        vacancies_occupied: true,
        admission_revenue: true,
      });
    }
  }, [currentUser]);

  const handleSaveMetrics = (newMetrics: Record<string, boolean>) => {
    const userKey = currentUser?.username || currentUser?.id || 'anonymous';
    localStorage.setItem(`jc_visible_metrics_${userKey}`, JSON.stringify(newMetrics));
    setVisibleMetrics(newMetrics);
  };

  // Admission Fee local states
  const [tempAdmissionFee, setTempAdmissionFee] = useState<string>(admissionFee.toString());
  const [tempFeeActive, setTempFeeActive] = useState<boolean>(admissionFeeActive);

  useEffect(() => {
    setTempAdmissionFee(admissionFee.toString());
  }, [admissionFee]);

  useEffect(() => {
    setTempFeeActive(admissionFeeActive);
  }, [admissionFeeActive]);

  const handleSaveAdmissionFeeConfig = () => {
    const parsed = parseFloat(tempAdmissionFee);
    if (isNaN(parsed) || parsed < 0) {
      triggerToast("❌ Ingrese un monto válido mayor o igual a cero.");
      return;
    }
    setAdmissionFee(parsed);
    setAdmissionFeeActive(tempFeeActive);
    triggerToast(`✨ Configuración del Derecho de Admisión guardada con éxito (S/. ${parsed.toFixed(2)} - ${tempFeeActive ? 'Activo' : 'Inactivo'}).`);
  };

  // Sidebar states (desktop collapsed, mobile toggle)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('jc_admin_sidebar_collapsed');
    return saved === 'true';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('jc_admin_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Route/Tab protection: auto-routing if activeTab is not permitted
  useEffect(() => {
    if (!hasPermission('Ver Dashboard')) {
      if (hasPermission('Ver reportes')) {
        setActiveTab('reports');
      } else if (hasPermission('Administrar sedes') || hasPermission('Configuración del sistema')) {
        setActiveTab('branches_districts');
      } else if (hasPermission('Administrar usuarios')) {
        setActiveTab('users');
      }
    }
  }, [currentUser, hasPermission]);

  const allSedes = React.useMemo(() => {
    return Object.values(dynamicSedesMap).flat();
  }, [dynamicSedesMap]);

  // Filter records by the logged-in user's assigned sedes
  const allowedSedes = currentUser?.sedes || ['all'];
  const hasAllSedes = allowedSedes.includes('all');
  
  const filteredRecordsBySede = React.useMemo(() => {
    if (hasAllSedes) return records;
    return records.filter(r => allowedSedes.includes(r.formState?.postulacion?.sedeLocal));
  }, [records, allowedSedes, hasAllSedes]);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
      confirmMsg += `\n\n⚠️ ADVERTENCIA: Se eliminarán también todas las sedes asociadas a este distrito.`;
    }
    if (hasApplicants) {
      confirmMsg += `\n\n⚠️ ADVERTENCIA: Existen expedientes de postulación registrados en este distrito.`;
    }

    setConfirmModal({
      isOpen: true,
      title: "Eliminar Distrito",
      message: confirmMsg,
      onConfirm: () => {
        setDynamicDistritos(dynamicDistritos.filter(d => d !== name));

        const updatedSedesMap = { ...dynamicSedesMap };
        delete updatedSedesMap[name];
        setDynamicSedesMap(updatedSedesMap);

        triggerToast(`🗑️ Distrito "${name}" eliminado.`);
      }
    });
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
      confirmMsg += `\n\n⚠️ ADVERTENCIA: Existen alumnos postulando a esta sede.`;
    }

    setConfirmModal({
      isOpen: true,
      title: "Eliminar Sede",
      message: confirmMsg,
      onConfirm: () => {
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
      }
    });
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
      confirmMsg += `\n\n⚠️ ADVERTENCIA: Existen expedientes registrados en este grado.`;
    }

    setConfirmModal({
      isOpen: true,
      title: "Eliminar Grado",
      message: confirmMsg,
      onConfirm: () => {
        setDynamicGrados(dynamicGrados.filter(g => g.value !== value));
        triggerToast(`🗑️ Grado "${label}" eliminado.`);
      }
    });
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
  const [activeFamilyTab, setActiveFamilyTab] = useState<'apoderado' | 'mama' | 'papa' | 'ficha'>('apoderado');

  // Selected headquarter for capacity & level management in config panel
  const [selectedManageSede, setSelectedManageSede] = useState<string>(() => {
    return Object.values(SEDES_POR_DISTRITO)[0]?.[0] || 'Cdra 7';
  });

  // Keep selectedManageSede within allowed sedes
  useEffect(() => {
    if (!hasAllSedes && allowedSedes.length > 0) {
      if (!allowedSedes.includes(selectedManageSede)) {
        setSelectedManageSede(allowedSedes[0]);
      }
    }
  }, [allowedSedes, hasAllSedes, selectedManageSede]);

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

  const TOTAL_VACANCIES_CAPACITY: number = React.useMemo(() => {
    return Object.entries(sedeCapacities).reduce((sum: number, [sedeName, cap]: [string, any]): number => {
      if (hasAllSedes || allowedSedes.includes(sedeName)) {
        return sum + (cap as number);
      }
      return sum;
    }, 0);
  }, [sedeCapacities, hasAllSedes, allowedSedes]);

  // Filter Active (non-deleted) records vs Soft deleted ones
  const activeRecords = filteredRecordsBySede.filter(r => !r.isDeleted);
  const deletedRecords = filteredRecordsBySede.filter(r => r.isDeleted);

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

  const canViewIncome = hasPermission('Ver reportes') || hasPermission('Ver ingresos') || currentUser?.roleAdmin === 'Super Administrador';

  const ALL_METRIC_CONFIGS = React.useMemo(() => [
    {
      key: 'total_applicants',
      label: 'Total de Postulantes',
      desc: 'Registrados Totales',
      colorClass: 'bg-blue-50 text-blue-700 border-blue-100',
      icon: Users,
      isIncome: false,
      getValue: () => countTotalApplicants,
    },
    {
      key: 'pending_approval',
      label: 'Preinscripciones Pendientes',
      desc: 'Espera de Aprobación',
      colorClass: 'bg-amber-50 text-amber-700 border-amber-100',
      icon: Clock,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'pending_approval').length,
    },
    {
      key: 'ready_for_completion',
      label: 'Pendientes de Completar Ficha',
      desc: 'Sin Ficha Técnica',
      colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      icon: Pencil,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'ready_for_completion').length,
    },
    {
      key: 'documents_pending',
      label: 'Pendientes de Documentos',
      desc: 'Falta Adjuntar Doc.',
      colorClass: 'bg-rose-50 text-rose-700 border-rose-100',
      icon: AlertCircle,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'documents_pending').length,
    },
    {
      key: 'documents_submitted',
      label: 'Documentos Recibidos',
      desc: 'Por Validar/Verificar',
      colorClass: 'bg-sky-50 text-sky-700 border-sky-100',
      icon: FileText,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'documents_submitted').length,
    },
    {
      key: 'documents_verified',
      label: 'Documentos Verificados',
      desc: 'Doc. Verificados',
      colorClass: 'bg-teal-50 text-teal-700 border-teal-100',
      icon: FileCheck2,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'documents_verified').length,
    },
    {
      key: 'payments_pending',
      label: 'Pagos Pendientes de Validación',
      desc: 'Depósitos por Aprobar',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-100',
      icon: CreditCard,
      isIncome: true,
      getValue: () => activeRecords.filter(r => r.paymentState === 'pending').length,
    },
    {
      key: 'payments_approved',
      label: 'Pagos Aprobados',
      desc: 'Abonos Confirmados',
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: Check,
      isIncome: true,
      getValue: () => activeRecords.filter(r => r.paymentState === 'paid').length,
    },
    {
      key: 'appointments_scheduled',
      label: 'Citas Psicopedagógicas Programadas',
      desc: 'Citas Agendadas',
      colorClass: 'bg-violet-50 text-violet-700 border-violet-100',
      icon: Calendar,
      isIncome: false,
      getValue: () => activeRecords.filter(r => !!r.appointment).length,
    },
    {
      key: 'appointments_completed',
      label: 'Citas Psicopedagógicas Realizadas',
      desc: 'Entrevistas Evaluadas',
      colorClass: 'bg-green-50 text-green-700 border-green-100',
      icon: UserCheck,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.appointmentApproved).length,
    },
    {
      key: 'academic_scheduled',
      label: 'Evaluaciones Académicas Programadas',
      desc: 'Conocimientos Agendados',
      colorClass: 'bg-purple-50 text-purple-700 border-purple-100',
      icon: School,
      isIncome: false,
      getValue: () => activeRecords.filter(r => !!r.academicEvaluation).length,
    },
    {
      key: 'academic_completed',
      label: 'Evaluaciones Académicas Realizadas',
      desc: 'Exámenes Concluidos',
      colorClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
      icon: Award,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.academicEvaluationApproved).length,
    },
    {
      key: 'admitted',
      label: 'Admitidos',
      desc: 'Vacantes Asignadas',
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: Award,
      isIncome: false,
      getValue: () => activeRecords.filter(r => r.status === 'admitted').length,
    },
    {
      key: 'enrolled',
      label: 'Matriculados',
      desc: 'Matrícula Completa',
      colorClass: 'bg-blue-50 text-blue-850 border-blue-100',
      icon: UserCheck,
      isIncome: false,
      getValue: () => countEnrolled,
    },
    {
      key: 'waiting_list',
      label: 'Lista de Espera',
      desc: 'En Cola de Asignación',
      colorClass: 'bg-amber-50 text-amber-700 border-amber-100',
      icon: Clock,
      isIncome: false,
      getValue: () => countWaitingList,
    },
    {
      key: 'observed',
      label: 'Observados',
      desc: 'Con Errores Detectados',
      colorClass: 'bg-red-50 text-red-700 border-red-100',
      icon: AlertTriangle,
      isIncome: false,
      getValue: () => countObserved,
    },
    {
      key: 'vacancies_available',
      label: 'Vacantes Disponibles',
      desc: 'Cupos Libres',
      colorClass: 'bg-slate-50 text-slate-700 border-slate-100',
      icon: Plus,
      isIncome: false,
      getValue: () => remainingVacancies,
    },
    {
      key: 'vacancies_occupied',
      label: 'Vacantes Ocupadas',
      desc: 'Cupos Comprometidos',
      colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      icon: Check,
      isIncome: false,
      getValue: () => countEnrolled,
    },
    {
      key: 'admission_revenue',
      label: 'Ingresos por Derecho de Admisión',
      desc: `${countPaid} Pagos Registrados`,
      colorClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      icon: TrendingUp,
      isIncome: true,
      format: (val: number) => `S/. ${val.toLocaleString('es-PE')}`,
      getValue: () => totalRevenue,
    }
  ], [
    activeRecords,
    countTotalApplicants,
    countEnrolled,
    countPaid,
    countAppointments,
    totalRevenue,
    countWaitingList,
    countObserved,
    remainingVacancies
  ]);

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

    const sedes = ['Castillo Las Lilas', 'Sede Los Portales', 'Sede Central'].filter(s => hasAllSedes || allowedSedes.includes(s));
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
    if (!hasPermission('Editar ficha')) {
      triggerToast("❌ No cuenta con el permiso 'Editar ficha' para eliminar expedientes.");
      return;
    }
    const name = `${app.formState.personales.nombres} ${app.formState.personales.apellidoPaterno}`;
    setConfirmModal({
      isOpen: true,
      title: "Enviar a Papelera",
      message: `¿Está seguro de eliminar el expediente de ${name}?`,
      onConfirm: () => {
        const updated: AdmissionRecord = {
          ...app,
          isDeleted: true
        };
        onSaveRecord(updated);
        addAuditLog('Eliminación de Postulante', `Se eliminó temporalmente el expediente del alumno ${name}.`, app.id);
        setSelectedApplicant(null);
        triggerToast("🗑️ Registro enviado a la papelera (petición de eliminación registrada).");
      }
    });
  };

  // Perform restore of soft deleted record
  const handleRestoreApplicant = (app: AdmissionRecord) => {
    if (!hasPermission('Editar ficha')) {
      triggerToast("❌ No cuenta con el permiso 'Editar ficha' para restaurar expedientes.");
      return;
    }
    const name = `${app.formState.personales.nombres} ${app.formState.personales.apellidoPaterno}`;
    const updated: AdmissionRecord = {
      ...app,
      isDeleted: false
    };
    onSaveRecord(updated);
    addAuditLog('Restauración de Postulante', `Se restauró satisfactoriamente el expediente del alumno ${name}.`, app.id);
    triggerToast("🔄 Registro restaurado con éxito a la lista principal.");
  };

  // Perform permanent delete of a record from the recycle bin
  const handlePermanentDeleteApplicant = (id: string, name: string) => {
    if (!hasPermission('Editar ficha')) {
      triggerToast("❌ No cuenta con el permiso 'Editar ficha' para realizar la eliminación permanente.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Eliminación Permanente",
      message: `⚠️ ADVERTENCIA: ¿Está seguro de eliminar permanentemente el expediente de "${name}"?\nEsta acción es irreversible y se borrarán todos sus datos.`,
      onConfirm: () => {
        if (onDeleteRecord) {
          onDeleteRecord(id);
          addAuditLog('Eliminación Permanente', `Se eliminó permanentemente el expediente de ${name}.`, id);
          triggerToast("🔥 Expediente eliminado permanentemente de manera definitiva.");
        } else {
          triggerToast("❌ Error: No se ha configurado la acción de eliminación definitiva.");
        }
      }
    });
  };

  // Save the modified status of an applicant
  const handleSaveStatusChange = () => {
    if (!selectedApplicant) return;

    const oldStatus = selectedApplicant.status;
    const newStatus = tempStatus as any;

    // Enforce programmatic permission checks
    if (newStatus === 'admitted' || newStatus === 'enrolled') {
      if (!hasPermission('Aprobar ficha')) {
        triggerToast("❌ No cuenta con el permiso 'Aprobar ficha' para admitir o matricular.");
        return;
      }
    } else if (newStatus === 'observed' || newStatus === 'documents_pending') {
      if (!hasPermission('Rechazar ficha')) {
        triggerToast("❌ No cuenta con el permiso 'Rechazar ficha' para observar o revertir a pendiente.");
        return;
      }
    } else {
      if (!hasPermission('Editar ficha')) {
        triggerToast("❌ No cuenta con el permiso 'Editar ficha' para modificar este expediente.");
        return;
      }
    }

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
      case 'pending_approval': return { text: 'Pre-Inscripción Pendiente', bg: 'bg-amber-50 text-amber-800 border-amber-200 font-medium' };
      case 'ready_for_completion': return { text: 'Pte. Completar Ficha', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-medium' };
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
    <div className="w-full max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Mobile/Tablet Header with Hamburger Menu Button */}
      <div className="lg:hidden w-full flex items-center justify-between bg-white px-5 py-4 border border-slate-200 rounded-3xl mb-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 rounded-xl hover:bg-slate-150 text-slate-700 transition cursor-pointer active:scale-95"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Juventud Científica
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Admisión 2027 • Admin
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 text-brand-navy text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-100">
            MAESTRO
          </span>
        </div>
      </div>

      {/* Mobile/Tablet Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />

            {/* Sidebar Slide-in */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 p-6 flex flex-col justify-between border-r border-slate-200 shadow-2xl overflow-y-auto lg:hidden"
            >
              <div className="space-y-6">
                {/* Header inside drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                      I.E. Juventud Científica
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                      Admisiones Virtuales 2027
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Menu in drawer */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2 mb-2">
                    Menú de Control
                  </span>

                  {hasPermission('Ver Dashboard') && (
                    <button
                      onClick={() => {
                        setActiveTab('applicants');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl font-bold text-sm transition text-left cursor-pointer ${
                        activeTab === 'applicants'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-5 h-5 shrink-0" />
                      <span>Gestión Postulantes</span>
                      <span className={`ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        activeTab === 'applicants' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {countTotalApplicants}
                      </span>
                    </button>
                  )}

                  {hasPermission('Ver reportes') && (
                    <button
                      onClick={() => {
                        setActiveTab('reports');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl font-bold text-sm transition text-left cursor-pointer ${
                        activeTab === 'reports'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-5 h-5 shrink-0" />
                      <span>Reportes & Vacantes</span>
                    </button>
                  )}

                  {(hasPermission('Administrar sedes') || hasPermission('Configuración del sistema')) && (
                    <button
                      onClick={() => {
                        setActiveTab('branches_districts');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl font-bold text-sm transition text-left cursor-pointer ${
                        activeTab === 'branches_districts'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <School className="w-5 h-5 shrink-0" />
                      <span>Distritos, Sedes y Grados</span>
                    </button>
                  )}

                  {hasPermission('Administrar usuarios') && (
                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl font-bold text-sm transition text-left cursor-pointer ${
                        activeTab === 'users'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-5 h-5 shrink-0" />
                      <span>Gestión de Usuarios</span>
                    </button>
                  )}
                </div>

                {/* Capacity Progress widget in drawer */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2">
                    Estado de Matrícula
                  </span>
                  <div className="space-y-2 px-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Matriculados:</span>
                      <strong className="text-green-700 font-extrabold">{countEnrolled}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Vacantes Libres:</span>
                      <strong className="text-brand-navy font-extrabold">{remainingVacancies}</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                      <div 
                        className="bg-green-600 h-full transition-all duration-500"
                        style={{ width: `${(countEnrolled / TOTAL_VACANCIES_CAPACITY) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions & Exit in drawer */}
              <div className="space-y-2 pt-4 border-t border-slate-100 mt-auto">
                {hasPermission('Configuración del sistema') && (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleClearAllRecords();
                      }}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 border border-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Limpiar Base de Datos (0 Alumnos)</span>
                    </button>

                    {onRestoreDemoRecords && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleRestoreDemoRecords();
                        }}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 border border-amber-200 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 shrink-0" />
                        <span>Restaurar Alumnos Demo</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full bg-slate-950 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Sidebar Menu */}
        <aside className={`hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6 lg:sticky lg:top-6 transition-all duration-300 ${
          isCollapsed ? 'lg:col-span-1 p-3.5' : 'lg:col-span-3 p-5'
        }`}>
          {/* Header/Brand info */}
          <div className={`pb-4 border-b border-slate-100 flex flex-col gap-3 relative ${isCollapsed ? 'items-center' : ''}`}>
            <div className="flex items-center justify-between gap-2 w-full">
              {!isCollapsed ? (
                <span className="bg-blue-50 text-brand-navy text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-blue" />
                  Admin Maestro
                </span>
              ) : (
                <ShieldAlert className="w-5 h-5 text-brand-blue mx-auto" />
              )}
              
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-2xs transition cursor-pointer"
                title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            {!isCollapsed && (
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  I.E. Juventud Científica
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                  Admisiones Virtuales 2027
                </p>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2 mb-2">
                Menú de Control
              </span>
            )}
            
            {hasPermission('Ver Dashboard') && (
              <button
                onClick={() => setActiveTab('applicants')}
                title="Gestión Postulantes"
                className={`w-full flex items-center transition text-left cursor-pointer relative ${
                  isCollapsed 
                    ? 'justify-center p-3 rounded-2xl' 
                    : 'gap-2.5 py-2.5 px-3 rounded-xl'
                } ${
                  activeTab === 'applicants'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && (
                  <>
                    <span className="font-bold text-xs">Gestión Postulantes</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'applicants' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {countTotalApplicants}
                    </span>
                  </>
                )}
                {isCollapsed && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {countTotalApplicants}
                  </span>
                )}
              </button>
            )}

            {hasPermission('Ver reportes') && (
              <button
                onClick={() => setActiveTab('reports')}
                title="Reportes & Vacantes"
                className={`w-full flex items-center transition text-left cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3 rounded-2xl' 
                    : 'gap-2.5 py-2.5 px-3 rounded-xl'
                } ${
                  activeTab === 'reports'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && <span className="font-bold text-xs">Reportes & Vacantes</span>}
              </button>
            )}

            {(hasPermission('Administrar sedes') || hasPermission('Configuración del sistema')) && (
              <button
                onClick={() => setActiveTab('branches_districts')}
                title="Distritos, Sedes y Grados"
                className={`w-full flex items-center transition text-left cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3 rounded-2xl' 
                    : 'gap-2.5 py-2.5 px-3 rounded-xl'
                } ${
                  activeTab === 'branches_districts'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <School className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && <span className="font-bold text-xs">Distritos, Sedes y Grados</span>}
              </button>
            )}

            {hasPermission('Administrar usuarios') && (
              <button
                onClick={() => setActiveTab('users')}
                title="Gestión de Usuarios"
                className={`w-full flex items-center transition text-left cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3 rounded-2xl' 
                    : 'gap-2.5 py-2.5 px-3 rounded-xl'
                } ${
                  activeTab === 'users'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UserCheck className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && <span className="font-bold text-xs">Gestión de Usuarios</span>}
              </button>
            )}
          </div>

          {/* Capacity Progress widget inside sidebar */}
          {!isCollapsed && (
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
          )}

          {/* Actions & Exit at bottom of sidebar */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            {hasPermission('Configuración del sistema') && (
              <>
                <button
                  onClick={handleClearAllRecords}
                  title="Limpiar Base de Datos (0 Alumnos)"
                  className={`w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold transition text-xs flex items-center justify-center border border-red-200 cursor-pointer ${
                    isCollapsed ? 'p-3 rounded-2xl' : 'py-2.5 px-3 rounded-xl gap-2'
                  }`}
                >
                  <Trash2 className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                  {!isCollapsed && <span>Limpiar Base de Datos</span>}
                </button>

                {onRestoreDemoRecords && (
                  <button
                    onClick={handleRestoreDemoRecords}
                    title="Restaurar Alumnos Demo"
                    className={`w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition text-xs flex items-center justify-center border border-amber-200 cursor-pointer ${
                      isCollapsed ? 'p-3 rounded-2xl' : 'py-2.5 px-3 rounded-xl gap-2'
                    }`}
                  >
                    <RefreshCw className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                    {!isCollapsed && <span>Restaurar Alumnos Demo</span>}
                  </button>
                )}
              </>
            )}
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className={`w-full bg-slate-950 hover:bg-red-700 text-white font-bold transition text-xs flex items-center justify-center cursor-pointer ${
                isCollapsed ? 'p-3 rounded-2xl' : 'py-2.5 px-3 rounded-xl gap-2'
              }`}
            >
              <LogOut className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
              {!isCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Active tab layout, info and action buttons */}
        <main className={`${isCollapsed ? 'lg:col-span-11' : 'lg:col-span-9'} col-span-12 space-y-6 transition-all duration-300`}>
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
                {activeTab === 'branches_districts' && "Sedes, Distritos y Grados"}
                {activeTab === 'users' && "Gestión de Usuarios y Permisos"}
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl">
                {activeTab === 'applicants' && "Supervise las fichas de postulación, verifique los documentos cargados, gestione citas psicopedagógicas y asigne vacantes oficiales."}
                {activeTab === 'reports' && "Métricas de matrícula, distribución geográfica por distritos, y estado financiero de recaudación por derecho de admisión."}
                {activeTab === 'branches_districts' && "Configure los distritos habilitados, cree nuevas sedes físicas escolares y administre los grados escolares correspondientes."}
                {activeTab === 'users' && "Consola administrativa para crear personal, configurar roles (Super Admin, Administrador de Sede, Operador) y otorgar permisos granulares."}
              </p>
            </div>

            {hasPermission('Exportar reportes') && (
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
            )}
          </div>

          {/* Metrics Grid Header & Customization Button */}
          {hasPermission('Ver estadísticas') && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1 px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Indicadores de Admisión</span>
              </h3>
              <button
                onClick={() => setIsCustomizingDashboard(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-1.5 transition bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl cursor-pointer border border-indigo-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Personalizar Dashboard</span>
              </button>
            </div>
          )}

          {/* Metrics Grid */}
          {hasPermission('Ver estadísticas') ? (
            (() => {
              const visibleList = ALL_METRIC_CONFIGS.filter(cfg => {
                // Respect income permission restriction
                if (cfg.isIncome && !canViewIncome) {
                  return false;
                }
                return visibleMetrics[cfg.key] !== false;
              });

              if (visibleList.length === 0) {
                return (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Todos los indicadores estadísticos están ocultos.</p>
                    <button
                      onClick={() => setIsCustomizingDashboard(true)}
                      className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Personalizar Dashboard
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visibleList.map(cfg => {
                    const IconComponent = cfg.icon;
                    const rawValue = cfg.getValue();
                    const displayedValue = cfg.format ? cfg.format(rawValue) : rawValue;
                    return (
                      <div
                        key={cfg.key}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-slate-300 transition duration-200"
                      >
                        <div className={`p-3 rounded-xl border ${cfg.colorClass} shrink-0`}>
                          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate" title={cfg.label}>
                            {cfg.label}
                          </span>
                          <strong className="block text-lg sm:text-xl font-black text-slate-900 truncate">
                            {displayedValue}
                          </strong>
                          <span className="text-[9px] text-slate-500 font-semibold block truncate" title={cfg.desc}>
                            {cfg.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                Estadísticas de admisión ocultas por política de rol
              </span>
            </div>
          )}

          {/* Tab content area */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {/* TAB 1: GESTION DE APICANTES */}
              {activeTab === 'applicants' && (
                !hasPermission('Ver Dashboard') ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                    <h3 className="text-base font-black text-slate-900 uppercase">Acceso Restringido</h3>
                    <p className="text-xs text-slate-500">No cuenta con el permiso "Ver Dashboard" para visualizar este módulo.</p>
                  </div>
                ) : (
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
                      (dynamicSedesMap[filterDistrict] || []).filter(sede => hasAllSedes || allowedSedes.includes(sede)).map(sede => (
                        <option key={sede} value={sede}>{sede}</option>
                      ))
                    ) : (
                      Object.values(dynamicSedesMap).flat().filter(sede => hasAllSedes || allowedSedes.includes(sede)).map(sede => (
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
                    <option value="pending_approval">Pre-Inscripción Pendiente</option>
                    <option value="ready_for_completion">Pte. Completar Ficha</option>
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
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleRestoreApplicant(app)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      <span>Restaurar</span>
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteApplicant(app.id, `${p.nombres} ${p.apellidoPaterno}`)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                                      title="Eliminar permanentemente de manera definitiva"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Eliminar Definitivo</span>
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
              </div>
            </motion.div>
          ))}

          {/* TAB 2: REPORTES Y ESTADISTICAS */}
          {activeTab === 'reports' && (
            !hasPermission('Ver reportes') ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-base font-black text-slate-900 uppercase">Acceso Restringido</h3>
                <p className="text-xs text-slate-500">No cuenta con el permiso "Ver reportes" para visualizar este módulo.</p>
              </div>
            ) : (
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
                      {Object.entries(dynamicSedesMap).map(([dist, sedes]) => {
                        const filteredSedes = sedes.filter(sede => hasAllSedes || allowedSedes.includes(sede));
                        if (filteredSedes.length === 0) return null;
                        return (
                          <optgroup key={dist} label={dist.toUpperCase()}>
                            {filteredSedes.map(sede => (
                              <option key={sede} value={sede}>{sede} ({dist})</option>
                            ))}
                          </optgroup>
                        );
                      })}
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
          ))}

          {/* TAB 3: GESTIÓN DE DISTRITOS, SEDES Y GRADOS */}
          {activeTab === 'branches_districts' && (
            (!hasPermission('Administrar sedes') && !hasPermission('Configuración del sistema')) ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-base font-black text-slate-900 uppercase">Acceso Restringido</h3>
                <p className="text-xs text-slate-500">No cuenta con los permisos requeridos ("Administrar sedes" o "Configuración del sistema") para visualizar este módulo.</p>
              </div>
            ) : (
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

                                {/* Dirección de la Sede */}
                                <div className="border-t border-slate-100 pt-2 space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                    Dirección de la Sede:
                                  </label>
                                  <input
                                    type="text"
                                    value={sedeAddresses[sede] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSedeAddresses(prev => ({
                                        ...prev,
                                        [sede]: val
                                      }));
                                    }}
                                    placeholder="Av. Ejemplo N° 123..."
                                    className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                  />
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

              {/* CONFIGURACIÓN DEL DERECHO DE ADMISIÓN */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="p-1.5 bg-blue-100 text-slate-800 rounded-lg">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                      Configuración del Derecho de Admisión
                    </h4>
                    <p className="text-xs text-slate-400">Establezca el importe requerido para el Pago por Derecho de Admisión.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  {/* Monto Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Monto del Derecho de Admisión (S/.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">S/.</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!hasPermission('Configuración del sistema')}
                        value={tempAdmissionFee}
                        onChange={(e) => setTempAdmissionFee(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Estado Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Estado del Derecho de Admisión
                    </label>
                    <select
                      disabled={!hasPermission('Configuración del sistema')}
                      value={tempFeeActive ? 'active' : 'inactive'}
                      onChange={(e) => setTempFeeActive(e.target.value === 'active')}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>

                {hasPermission('Configuración del sistema') ? (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAdmissionFeeConfig}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition duration-150 shadow-sm cursor-pointer"
                    >
                      Guardar Configuración
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic mt-2">
                    * Solo los usuarios con permisos de administración ("Configuración del sistema") pueden modificar estos valores. Los demás usuarios únicamente pueden visualizarlos.
                  </p>
                )}
              </div>
            </motion.div>
          ))}

          {/* TAB 4: GESTIÓN DE USUARIOS Y PERMISOS */}
          {activeTab === 'users' && (
            !hasPermission('Administrar usuarios') ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                <h3 className="text-base font-black text-slate-900 uppercase">Acceso Restringido</h3>
                <p className="text-xs text-slate-500">No cuenta con el permiso "Administrar usuarios" para visualizar este módulo.</p>
              </div>
            ) : (
              <UsersManagementView
                allSedes={allSedes}
                triggerToast={triggerToast}
                currentUser={currentUser}
              />
            )
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
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
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

                {/* 1. Información General */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 border-b pb-1">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span>Información General</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Código de Ficha (Expediente)</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.id}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Código de Familia</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.codigoFamilia || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Código del Postulante</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">
                        {selectedApplicant.formState.postulacion.tipoAlumno === 'antiguo' ? selectedApplicant.formState.postulacion.codigoAntiguo : 'N/A (Alumno Nuevo)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Año Escolar de Postulación</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.anoProceso || '2027'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Fecha de Registro</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.createdAt || 'No registrada'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Estado de la Postulación</p>
                      <p className="font-extrabold text-blue-700 mt-0.5 uppercase">{getStatusLabel(selectedApplicant.status).text}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Datos de la Postulación (Paso 1) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 border-b pb-1">
                    <Award className="w-4 h-4 text-indigo-500" />
                    <span>Datos de la Postulación (Paso 1)</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nivel Educativo</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.nivelEducativo}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Grado de Ingreso</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.gradoIngreso}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Sede de Postulación</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.sedeLocal}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Distrito de Postulación</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.distritoPostulacion}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Turno de Preferencia</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.postulacion.turnoPreferencia}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tipo de Alumno</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">
                        {selectedApplicant.formState.postulacion.tipoAlumno === 'nuevo' ? 'Alumno Nuevo' : 'Reingresante'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Datos Personales del Postulante (Paso 3) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 border-b pb-1">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Datos Personales del Postulante (Paso 3)</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombres</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.nombres}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Apellido Paterno</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.apellidoPaterno}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Apellido Materno</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.apellidoMaterno}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tipo & N° de Documento</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">
                        {selectedApplicant.formState.personales.tipoDocumento}: {selectedApplicant.formState.personales.numeroDocumento}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Género</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.genero}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Fecha de Nacimiento</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.fechaNacimiento}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Celular de Contacto</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.celularContacto || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Colegio de Procedencia</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.colegioProcedencia || 'Ninguno'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tipo de Colegio</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.tipoColegioProcedencia || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Distrito del Colegio</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.personales.nivelGradoProcedencia || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">País de Nacimiento</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.lugarAdicionales?.paisNacimiento || 'Perú'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Lugar de Nacimiento</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">
                        {selectedApplicant.formState.lugarAdicionales?.lugarNacimiento || 'Lima'} ({selectedApplicant.formState.lugarAdicionales?.departamento || 'Lima'} - {selectedApplicant.formState.lugarAdicionales?.provincia || 'Lima'} - {selectedApplicant.formState.lugarAdicionales?.distrito || 'Lima'})
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Vive con</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.lugarAdicionales?.viveCon || 'Padres'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Responsable de Matrícula</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.lugarAdicionales?.responsableMatricula || 'No especificado'}</p>
                    </div>
                  </div>

                  {/* Salud & Religión block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="font-extrabold text-slate-700 block uppercase text-[10px] tracking-wider">Salud y Seguro</span>
                      <p className="pt-1"><span className="text-slate-400">¿Cuenta con Seguro?:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.cuentaSeguro || 'No'}</strong></p>
                      {selectedApplicant.formState.lugarAdicionales?.cuentaSeguro === 'Si' && (
                        <p><span className="text-slate-400">Compañía Aseguradora:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.aseguradora || 'No registrada'}</strong></p>
                      )}
                      <p><span className="text-slate-400">Diagnóstico Médico/Psic.:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.tieneDiagnostico || 'No'}</strong></p>
                      {selectedApplicant.formState.lugarAdicionales?.tieneDiagnostico === 'Si' && (
                        <p><span className="text-slate-400">Detalles Diagnóstico:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.diagnosticoDetalle || 'Ninguno'}</strong></p>
                      )}
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="font-extrabold text-slate-700 block uppercase text-[10px] tracking-wider">Religión y Sacramentos</span>
                      <p className="pt-1"><span className="text-slate-400">Religión del Menor:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.religion || 'Católica'}</strong></p>
                      <p><span className="text-slate-400">¿Asiste a alguna Iglesia?:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.asisteIglesia || 'No'}</strong></p>
                      {selectedApplicant.formState.lugarAdicionales?.asisteIglesia === 'Si' && (
                        <p><span className="text-slate-400">Nombre Iglesia/Parroquia:</span> <strong className="text-slate-800">{selectedApplicant.formState.lugarAdicionales?.iglesiaParroquia || 'No especificada'}</strong></p>
                      )}
                      <p>
                        <span className="text-slate-400">Sacramentos:</span>{' '}
                        <strong className="text-slate-800">
                          {selectedApplicant.formState.lugarAdicionales?.bautizado ? 'Bautizado ✓' : 'No Bautizado'}
                          {selectedApplicant.formState.lugarAdicionales?.primeraComunion ? ' | Primera Comunión ✓' : ' | Sin Primera Comunión'}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Información de Padres y Apoderado Legal */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Familiar y Apoderado Legal (Paso 2)</span>
                    </div>
                    {/* Compact tabs */}
                    <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
                      {[
                        { id: 'apoderado', label: 'Apoderado' },
                        { id: 'mama', label: 'Mamá' },
                        { id: 'papa', label: 'Papá' },
                        { id: 'ficha', label: 'Ficha Fam.' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveFamilyTab(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            activeFamilyTab === tab.id
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFamilyTab === 'apoderado' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombres y Apellidos</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.apoderado.nombres} {selectedApplicant.formState.padresTutores.apoderado.apellidoPaterno} {selectedApplicant.formState.padresTutores.apoderado.apellidoMaterno}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Documento de Identidad</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.apoderado.tipoDocumento || 'DNI'}: {selectedApplicant.formState.padresTutores.apoderado.numeroDocumento}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Celular</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.celularContacto}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Correo Electrónico</p>
                        <p className="font-extrabold text-slate-800 mt-0.5 break-all">{selectedApplicant.formState.padresTutores.apoderado.correoElectronico}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Domicilio</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.apoderado.pais || 'Perú'} - {selectedApplicant.formState.padresTutores.apoderado.departamento || 'Lima'} - {selectedApplicant.formState.padresTutores.apoderado.provincia || 'Lima'} - {selectedApplicant.formState.padresTutores.apoderado.distrito || 'Lima'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Dirección Exacta</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.direccionDomicilio || 'No registrada'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Grado Instrucción / Profesión</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.apoderado.gradoInstruccion} / {selectedApplicant.formState.padresTutores.apoderado.profesionOcupacion}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Centro de Trabajo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.centroTrabajo || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cargo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.apoderado.cargo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Ingresos Mensuales / Horario</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          S/. {selectedApplicant.formState.padresTutores.apoderado.ingresosMensuales || 'No especificado'} ({selectedApplicant.formState.padresTutores.apoderado.horarioLaboral || 'No registrado'})
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Estado de Vida</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.apoderado.fallecido ? '⚠️ Finado (Fallecido)' : 'Vivo'}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeFamilyTab === 'mama' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombres y Apellidos</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.mama.nombres} {selectedApplicant.formState.padresTutores.mama.apellidoPaterno} {selectedApplicant.formState.padresTutores.mama.apellidoMaterno}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Documento de Identidad</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.mama.tipoDocumento || 'DNI'}: {selectedApplicant.formState.padresTutores.mama.numeroDocumento}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Celular</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.mama.celularContacto}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Correo Electrónico</p>
                        <p className="font-extrabold text-slate-800 mt-0.5 break-all">{selectedApplicant.formState.padresTutores.mama.correoElectronico}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Domicilio</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.mama.pais || 'Perú'} - {selectedApplicant.formState.padresTutores.mama.departamento || 'Lima'} - {selectedApplicant.formState.padresTutores.mama.provincia || 'Lima'} - {selectedApplicant.formState.padresTutores.mama.distrito || 'Lima'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Dirección Exacta</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.mama.direccionDomicilio || 'No registrada'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Grado Instrucción / Profesión</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.mama.gradoInstruccion} / {selectedApplicant.formState.padresTutores.mama.profesionOcupacion}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Centro de Trabajo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.mama.centroTrabajo || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cargo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.mama.cargo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Ingresos Mensuales / Horario</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          S/. {selectedApplicant.formState.padresTutores.mama.ingresosMensuales || 'No especificado'} ({selectedApplicant.formState.padresTutores.mama.horarioLaboral || 'No registrado'})
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Estado de Vida</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.mama.fallecido ? '⚠️ Finada (Fallecida)' : 'Viva'}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeFamilyTab === 'papa' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombres y Apellidos</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.papa.nombres} {selectedApplicant.formState.padresTutores.papa.apellidoPaterno} {selectedApplicant.formState.padresTutores.papa.apellidoMaterno}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Documento de Identidad</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.papa.tipoDocumento || 'DNI'}: {selectedApplicant.formState.padresTutores.papa.numeroDocumento}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Celular</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.papa.celularContacto}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Correo Electrónico</p>
                        <p className="font-extrabold text-slate-800 mt-0.5 break-all">{selectedApplicant.formState.padresTutores.papa.correoElectronico}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Domicilio</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.papa.pais || 'Perú'} - {selectedApplicant.formState.padresTutores.papa.departamento || 'Lima'} - {selectedApplicant.formState.padresTutores.papa.provincia || 'Lima'} - {selectedApplicant.formState.padresTutores.papa.distrito || 'Lima'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Dirección Exacta</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.papa.direccionDomicilio || 'No registrada'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Grado Instrucción / Profesión</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.papa.gradoInstruccion} / {selectedApplicant.formState.padresTutores.papa.profesionOcupacion}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Centro de Trabajo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.papa.centroTrabajo || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cargo</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.padresTutores.papa.cargo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Ingresos Mensuales / Horario</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          S/. {selectedApplicant.formState.padresTutores.papa.ingresosMensuales || 'No especificado'} ({selectedApplicant.formState.padresTutores.papa.horarioLaboral || 'No registrado'})
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Estado de Vida</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.padresTutores.papa.fallecido ? '⚠️ Finado (Fallecido)' : 'Vivo'}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeFamilyTab === 'ficha' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombre de la Familia</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.nombreFamilia || 'Pérez Luján'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Código de Familia</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.codigoFamilia || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Teléfono de Contacto</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.telefonoContacto || 'Ninguno'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Estado Civil de los Padres</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.estadoCivilPadres || 'Casados'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Dirección de Residencia</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.direccionResidencia || 'No registrada'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">¿Tiene Hermanos en el Colegio?</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">
                          {selectedApplicant.formState.fichaFamilia?.tieneHermanosColegio === 'Si' ? `Sí (${selectedApplicant.formState.fichaFamilia?.cantidadHermanos} hermano(s))` : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Situación de la Vivienda</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{selectedApplicant.formState.fichaFamilia?.viviendaSituacion || 'Propia'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Documents checklist */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Documentos Cargados</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    {(() => {
                      const isPrivateSchool = selectedApplicant.formState.personales.tipoColegioProcedencia === 'Colegio Particular';
                      const isConductReq = requiresGoodConduct(selectedApplicant.formState.postulacion.gradoIngreso);

                      return [
                        { key: 'dniPostulante', label: 'DNI Postulante', required: true },
                        { key: 'dniApoderado', label: 'DNI Apoderado', required: true },
                        { key: 'reciboServicio', label: 'Recibo Servicio', required: true },
                        ...(isPrivateSchool ? [{ key: 'constanciaNoAdeudo', label: 'Constancia No Adeudo', required: true }] : []),
                        ...(isConductReq ? [{ key: 'cartaBuenaConducta', label: 'Carta Buena Conducta', required: true }] : [])
                      ].map(doc => {
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

                        return (
                          <div key={doc.key} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">{doc.label}</span>
                            {isUploaded ? (
                              <span className="text-[10px] text-green-700 font-black mt-1.5 break-all block">
                                ✓ {fileLabel}
                              </span>
                            ) : (
                              <div className="mt-1.5">
                                <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  FALTA
                                </span>
                                {fileLabel && (
                                  <span className="text-[9px] text-amber-600 font-semibold block mt-0.5 leading-tight">
                                    {fileLabel}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Inline visualizer for DNI Frontal & Posterior */}
                  <div className="pt-2 border-t border-slate-200">
                    <h5 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-3">Previsualización de Documentos DNI</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* DNI Postulante */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                        <span className="font-extrabold text-[11px] text-slate-700 block border-b pb-1">DNI del Postulante</span>
                        {(() => {
                          const rawVal = selectedApplicant.documents?.['dniPostulante'];
                          const parsed = parseDniValue(rawVal);
                          const studentName = selectedApplicant.formState?.personales?.nombres || 'Postulante';
                          const studentLastName = `${selectedApplicant.formState?.personales?.apellidoPaterno || ''} ${selectedApplicant.formState?.personales?.apellidoMaterno || ''}`.trim() || 'Apellidos';
                          const studentDocNum = selectedApplicant.formState?.personales?.numeroDocumento || '00000000';
                          const birthDate = selectedApplicant.formState?.personales?.fechaNacimiento || 'DD/MM/AAAA';
                          const gender = selectedApplicant.formState?.personales?.genero || 'M/F';

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Frontal */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                {parsed.frontal ? (
                                  <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                      <div className="w-6 h-7 bg-indigo-200 border border-indigo-300 rounded flex items-center justify-center text-[8px] font-bold text-indigo-700 shrink-0">Foto</div>
                                      <div className="text-right">
                                        <span className="text-[8px] font-extrabold text-blue-600 block leading-tight font-mono">REPÚBLICA DEL PERÚ</span>
                                        <span className="text-[7px] text-slate-400 block leading-none font-mono">DNI POSTULANTE</span>
                                      </div>
                                    </div>
                                    <div className="text-[8px] space-y-0.5 mt-2 font-mono">
                                      <p className="truncate"><span className="text-slate-400">Apellidos:</span> <strong className="text-slate-700">{studentLastName}</strong></p>
                                      <p className="truncate"><span className="text-slate-400">Nombres:</span> <strong className="text-slate-700">{studentName}</strong></p>
                                      <p className="truncate"><span className="text-slate-400">Nº Doc:</span> <strong className="text-blue-700 font-extrabold">{studentDocNum}</strong></p>
                                    </div>
                                    <span className="text-[8px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded mt-2 text-center block truncate">
                                      ✓ Cara Frontal
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                                    <AlertCircle className="w-6 h-6 text-slate-300 mb-1" />
                                    <span className="text-[9px] text-slate-400 font-semibold leading-tight">Cara Frontal no cargada</span>
                                  </div>
                                )}
                              </div>

                              {/* Posterior */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                {parsed.posterior ? (
                                  <div className="flex-1 flex flex-col justify-between">
                                    <div className="w-full h-2 bg-slate-400 rounded-sm mb-1"></div>
                                    <div className="text-[8px] space-y-0.5 font-mono">
                                      <p className="truncate"><span className="text-slate-400">F. Nac:</span> <strong className="text-slate-700">{birthDate}</strong></p>
                                      <p className="truncate"><span className="text-slate-400">Sexo:</span> <strong className="text-slate-700">{gender}</strong></p>
                                    </div>
                                    <div className="border border-dashed border-slate-300 p-1 rounded bg-white text-center mt-2">
                                      <span className="text-[6px] text-slate-400 block tracking-widest font-mono">|||||| |||| || |||||</span>
                                    </div>
                                    <span className="text-[8px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.5 rounded mt-2 text-center block truncate">
                                      ✓ Cara Posterior
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                                    <AlertCircle className="w-6 h-6 text-slate-300 mb-1" />
                                    <span className="text-[9px] text-slate-400 font-semibold leading-tight">Cara Posterior no cargada</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* DNI Apoderado */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                        <span className="font-extrabold text-[11px] text-slate-700 block border-b pb-1">DNI del Apoderado</span>
                        {(() => {
                          const rawVal = selectedApplicant.documents?.['dniApoderado'];
                          const parsed = parseDniValue(rawVal);
                          const apoName = selectedApplicant.formState?.padresTutores?.apoderado?.nombres || 'Apoderado';
                          const apoLastName = `${selectedApplicant.formState?.padresTutores?.apoderado?.apellidoPaterno || ''} ${selectedApplicant.formState?.padresTutores?.apoderado?.apellidoMaterno || ''}`.trim() || 'Apellidos';
                          const apoDocNum = selectedApplicant.formState?.padresTutores?.apoderado?.numeroDocumento || '00000000';
                          const birthDate = selectedApplicant.formState?.padresTutores?.apoderado?.fechaNacimiento || 'DD/MM/AAAA';

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Frontal */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                {parsed.frontal ? (
                                  <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                      <div className="w-6 h-7 bg-amber-200 border border-amber-300 rounded flex items-center justify-center text-[8px] font-bold text-amber-700 shrink-0">Foto</div>
                                      <div className="text-right">
                                        <span className="text-[8px] font-extrabold text-blue-600 block leading-tight font-mono">REPÚBLICA DEL PERÚ</span>
                                        <span className="text-[7px] text-slate-400 block leading-none font-mono">DNI APODERADO</span>
                                      </div>
                                    </div>
                                    <div className="text-[8px] space-y-0.5 mt-2 font-mono">
                                      <p className="truncate"><span className="text-slate-400">Apellidos:</span> <strong className="text-slate-700">{apoLastName}</strong></p>
                                      <p className="truncate"><span className="text-slate-400">Nombres:</span> <strong className="text-slate-700">{apoName}</strong></p>
                                      <p className="truncate"><span className="text-slate-400">Nº Doc:</span> <strong className="text-blue-700 font-extrabold">{apoDocNum}</strong></p>
                                    </div>
                                    <span className="text-[8px] text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded mt-2 text-center block truncate">
                                      ✓ Cara Frontal
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                                    <AlertCircle className="w-6 h-6 text-slate-300 mb-1" />
                                    <span className="text-[9px] text-slate-400 font-semibold leading-tight">Cara Frontal no cargada</span>
                                  </div>
                                )}
                              </div>

                              {/* Posterior */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                {parsed.posterior ? (
                                  <div className="flex-1 flex flex-col justify-between">
                                    <div className="w-full h-2 bg-slate-400 rounded-sm mb-1"></div>
                                    <div className="text-[8px] space-y-0.5 font-mono">
                                      <p className="truncate"><span className="text-slate-400">F. Nac:</span> <strong className="text-slate-700">{birthDate}</strong></p>
                                    </div>
                                    <div className="border border-dashed border-slate-300 p-1 rounded bg-white text-center mt-2">
                                      <span className="text-[6px] text-slate-400 block tracking-widest font-mono">|||||| |||| || |||||</span>
                                    </div>
                                    <span className="text-[8px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.5 rounded mt-2 text-center block truncate">
                                      ✓ Cara Posterior
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                                    <AlertCircle className="w-6 h-6 text-slate-300 mb-1" />
                                    <span className="text-[9px] text-slate-400 font-semibold leading-tight">Cara Posterior no cargada</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sede y Salón (Reemplaza Pabellón y Aula) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 border-b pb-1">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Sede y Salón de Clases</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <p className="text-slate-400 font-semibold">Sede Escolar Asignada:</p>
                      <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedApplicant.formState.postulacion.sedeLocal}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Salón / Aula de Clases:</p>
                      {selectedApplicant.status === 'enrolled' && selectedApplicant.assignedClassroom ? (
                        <p className="font-black text-green-700 text-sm pt-1 bg-green-50 px-2 py-1 rounded-lg border border-green-200 mt-1 inline-block">
                          {selectedApplicant.assignedClassroom}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic pt-1.5">Pendiente de asignación después de la matrícula.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nuevo Flujo: Gestión de Pasos de Admisión & Aprobaciones */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
                  <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Control de Pasos de Admisión & Aprobaciones</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* A. Validación de Pago Derecho de Admisión */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-800 block uppercase text-[10px] tracking-wider">
                        1. Pago Derecho de Admisión
                      </span>
                      {selectedApplicant.paymentComprobante ? (
                        <div className="space-y-2">
                          <p className="text-slate-500 font-semibold text-[10px] break-all">
                            📄 {selectedApplicant.paymentComprobante}
                          </p>
                          <div className="space-y-1 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg font-mono">
                            <p>Monto: S/. {selectedApplicant.paymentAmount || '350.00'}</p>
                            <p>Código: {selectedApplicant.paymentCode || `OP-${selectedApplicant.id}`}</p>
                            {selectedApplicant.paymentApprover && (
                              <p className="text-emerald-700 font-bold">Validador: {selectedApplicant.paymentApprover}</p>
                            )}
                            {selectedApplicant.paymentApprovedAt && (
                              <p className="text-emerald-700 font-bold">Fecha Val: {selectedApplicant.paymentApprovedAt}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Estado:</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              selectedApplicant.paymentState === 'paid' ? 'bg-green-100 text-green-800' :
                              selectedApplicant.paymentState === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {selectedApplicant.paymentState === 'paid' ? 'Aprobado ✓' :
                               selectedApplicant.paymentState === 'rejected' ? 'Rechazado ❌' :
                               'En revisión'}
                            </span>
                          </div>
                          
                          {selectedApplicant.paymentState === 'reviewing' && (
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => {
                                  const updated = {
                                    ...selectedApplicant,
                                    paymentState: 'paid' as const,
                                    paymentApprover: currentUser?.nombres || currentUser?.username || 'Administrador',
                                    paymentApprovedAt: new Date().toLocaleDateString('es-PE')
                                  };
                                  onSaveRecord(updated);
                                  setSelectedApplicant(updated);
                                  triggerToast("💰 Pago de admisión aprobado con éxito.");
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-1 px-1.5 rounded-lg text-[10px] transition cursor-pointer"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => {
                                  const updated = {
                                    ...selectedApplicant,
                                    paymentState: 'rejected' as const
                                  };
                                  onSaveRecord(updated);
                                  setSelectedApplicant(updated);
                                  triggerToast("❌ Pago de admisión rechazado.");
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-1 px-1.5 rounded-lg text-[10px] transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px] pt-1">Ningún comprobante cargado.</p>
                      )}
                    </div>

                    {/* B. Asistencia Cita Psicopedagógica */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-800 block uppercase text-[10px] tracking-wider">
                        2. Cita Psicopedagógica
                      </span>
                      {selectedApplicant.appointment ? (
                        <div className="space-y-2">
                          <div className="text-[10px] text-slate-600 leading-tight">
                            <p><strong>Fecha:</strong> {selectedApplicant.appointment.dateLabel || selectedApplicant.appointment.date}</p>
                            <p><strong>Horario:</strong> {selectedApplicant.appointment.timeSlot || selectedApplicant.appointment.time}</p>
                            <p><strong>Especialista:</strong> {selectedApplicant.appointment.psychologist || 'Por designar'}</p>
                            <p><strong>Obs:</strong> {selectedApplicant.appointment.observations || 'Sin observaciones'}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Asistencia:</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              selectedApplicant.appointmentApproved ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {selectedApplicant.appointmentApproved ? 'Aprobada ✓' : 'Pendiente'}
                            </span>
                          </div>

                          {!selectedApplicant.appointmentApproved && (
                            <button
                              onClick={() => {
                                const updated = {
                                  ...selectedApplicant,
                                  appointmentApproved: true
                                };
                                onSaveRecord(updated);
                                setSelectedApplicant(updated);
                                triggerToast("📅 Asistencia a cita psicopedagógica aprobada.");
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-1 px-2 rounded-lg text-[10px] transition cursor-pointer"
                            >
                              Registrar Asistencia
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px] pt-1">Cita no agendada todavía.</p>
                      )}
                    </div>

                    {/* C. Evaluación Académica (solo grados aplicables) */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-800 block uppercase text-[10px] tracking-wider">
                        3. Evaluación Académica
                      </span>
                      {(() => {
                        const gradeName = selectedApplicant.formState.postulacion.gradoIngreso;
                        const requiresEval = gradeName && !gradeName.toLowerCase().includes('inicial');
                        
                        if (!requiresEval) {
                          return <p className="text-slate-400 italic text-[11px] pt-1">No aplica para este grado (Inicial).</p>;
                        }

                        if (selectedApplicant.academicEvaluation) {
                          return (
                            <div className="space-y-2">
                              <div className="text-[10px] text-slate-600 leading-tight">
                                <p><strong>Fecha:</strong> {selectedApplicant.academicEvaluation.dateLabel}</p>
                                <p><strong>Horario:</strong> {selectedApplicant.academicEvaluation.timeSlot}</p>
                                <p><strong>Obs:</strong> {selectedApplicant.academicEvaluation.observations || 'Sin observaciones'}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500">Asistencia:</span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                  selectedApplicant.academicEvaluationApproved ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                                }}`}>
                                  {selectedApplicant.academicEvaluationApproved ? 'Aprobada ✓' : 'Pendiente'}
                                </span>
                              </div>

                              {!selectedApplicant.academicEvaluationApproved && (
                                <button
                                  onClick={() => {
                                    const updated = {
                                      ...selectedApplicant,
                                      academicEvaluationApproved: true
                                    };
                                    onSaveRecord(updated);
                                    setSelectedApplicant(updated);
                                    triggerToast("📝 Asistencia a evaluación académica aprobada.");
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-1 px-2 rounded-lg text-[10px] transition cursor-pointer"
                                >
                                  Registrar Asistencia
                                </button>
                              )}
                            </div>
                          );
                        }

                        return <p className="text-slate-400 italic text-[11px] pt-1">Evaluación no agendada todavía.</p>;
                      })()}
                    </div>
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

      {/* CUSTOM CONFIRMATION DIALOG */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="bg-amber-50 p-2.5 rounded-full border border-amber-200 text-amber-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZE DASHBOARD MODAL */}
      <AnimatePresence>
        {isCustomizingDashboard && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase">Personalizar Dashboard</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Configure qué indicadores desea visualizar en su pantalla principal.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomizingDashboard(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Checkbox selector container */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <p className="text-xs text-slate-500 font-medium">
                  Marque o desmarque los indicadores para mostrar u ocultar las tarjetas correspondientes. Los cambios se guardarán automáticamente para su usuario.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {ALL_METRIC_CONFIGS
                    .filter(cfg => cfg.isIncome ? canViewIncome : true)
                    .map(cfg => {
                      const IconComponent = cfg.icon;
                      const isChecked = visibleMetrics[cfg.key] !== false;
                      return (
                        <label
                          key={cfg.key}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                            isChecked
                              ? 'bg-indigo-50/40 border-indigo-200 text-indigo-950 font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = {
                                ...visibleMetrics,
                                [cfg.key]: e.target.checked
                              };
                              handleSaveMetrics(updated);
                            }}
                            className="w-4.5 h-4.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className={`p-1.5 rounded-lg border ${cfg.colorClass}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs truncate">{cfg.label}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{cfg.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Modal footer actions */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between gap-3 shrink-0">
                <button
                  onClick={() => {
                    // Activate all
                    const allActive: Record<string, boolean> = {};
                    ALL_METRIC_CONFIGS.forEach(cfg => {
                      allActive[cfg.key] = true;
                    });
                    handleSaveMetrics(allActive);
                    triggerToast("✨ Todos los indicadores han sido activados.");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition text-xs border border-slate-200 cursor-pointer"
                >
                  Activar todos
                </button>
                <button
                  onClick={() => setIsCustomizingDashboard(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl transition text-xs shadow-md cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
