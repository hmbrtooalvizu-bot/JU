import { jsPDF } from 'jspdf';
import { FormState } from '../types';

function translateStatus(status?: string): string {
  switch (status) {
    case 'documents_pending': return 'Pendiente de Documentos';
    case 'documents_submitted': return 'Documentos Presentados (En Revisión)';
    case 'documents_verified': return 'Documentos Verificados';
    case 'interview_scheduled': return 'Cita Psicopedagógica Programada';
    case 'interview_completed': return 'Cita Psicopedagógica Completada';
    case 'admitted': return 'Admitido (Vacante Asignada)';
    case 'enrolled': return 'Matriculado con Aula Asignada';
    case 'observed': return 'Observado / Con Observaciones';
    case 'waiting_list': return 'En Lista de Espera';
    default: return 'Pre-Inscrito (Pendiente de Validación)';
  }
}

function translatePaymentState(state?: string): string {
  switch (state) {
    case 'pending': return 'Pendiente de Pago';
    case 'reviewing': return 'Pago en Revisión';
    case 'paid': return 'Pagado y Confirmado';
    case 'rejected': return 'Pago Rechazado';
    default: return 'Pendiente de Pago';
  }
}

export function downloadConstanciaPDF(formState: FormState, record?: any) {
  const { postulacion, personales, lugarAdicionales, fichaFamilia, padresTutores } = formState;
  const { papa, mama, apoderado } = padresTutores;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const famCode = fichaFamilia?.codigoFamilia || 'FAM-TEMP';
  const fileName = `Expediente_Admision_${famCode}.pdf`;

  // --- Theme Colors ---
  const primaryColor = [21, 48, 94];      // #15305e (Brand Navy)
  const secondaryColor = [245, 158, 11];  // #f59e0b (Amber/Gold)
  const textColor = [71, 85, 105];       // slate-600
  const darkTextColor = [15, 23, 42];    // slate-900
  const labelColor = [100, 116, 139];     // slate-500
  const lineGray = [226, 232, 240];       // slate-200
  const lightBg = [248, 250, 252];        // slate-50

  const totalPages = 3;

  // --- Helper: Draw Page Header and Footer ---
  const drawPageBorders = (pageNumber: number) => {
    // Top border band (Navy)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F');
    
    // Bottom border band (Navy)
    doc.rect(0, 289, 210, 8, 'F');

    // Page number text in footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(`Página ${pageNumber} de ${totalPages}`, 105, 285, { align: 'center' });
    doc.text('I.E. JUVENTUD CIENTÍFICA - Expediente Oficial de Admisión', 15, 285);
  };

  // --- Helper: Draw Section Title ---
  const drawSectionTitle = (title: string, yPos: number) => {
    // Decorative box background
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, yPos - 5, 180, 7, 'F');
    
    // Left accent bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, yPos - 5, 2, 7, 'F');

    // Text label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title.toUpperCase(), 19, yPos);

    // Separator line
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.setLineWidth(0.3);
    doc.line(15, yPos + 3, 195, yPos + 3);
  };

  // --- Helper: Draw Two Columns of Data ---
  const drawGridRow = (
    label1: string, val1: string,
    label2: string, val2: string,
    yPos: number
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(label1, 15, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    const cleanVal1 = val1 || 'No especificado';
    doc.text(cleanVal1, 55, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(label2, 110, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    const cleanVal2 = val2 || 'No especificado';
    doc.text(cleanVal2, 150, yPos);
  };

  // ==========================================
  // PAGE 1: CABECERA, PROCESO, POSTULACIÓN & DATOS PERSONALES
  // ==========================================
  drawPageBorders(1);

  // School Crest Circular representation
  doc.setFillColor(255, 255, 255);
  doc.ellipse(105, 25, 13, 13, 'F');
  doc.setLineWidth(0.6);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.ellipse(105, 25, 13, 13, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('JC', 105, 27, { align: 'center' });

  // School name & motto
  doc.setFontSize(12.5);
  doc.text('I.E. JUVENTUD CIENTÍFICA', 105, 43, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('"Ciencia, Disciplina y Valores de Alto Rendimiento"', 105, 47.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Autorización Ministerial N° 0451-2015-MINEDU', 105, 51.5, { align: 'center' });

  // Separator
  doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
  doc.setLineWidth(0.4);
  doc.line(15, 54, 195, 54);

  // Main Document Header Block
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 58, 180, 14, 'F');
  doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
  doc.rect(15, 58, 180, 14, 'S');

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(15, 58, 2, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('EXPEDIENTE COMPLETO DEL POSTULANTE', 20, 67);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`EXPEDIENTE: ${famCode}`, 190, 67, { align: 'right' });

  // Section 1: Información General del Proceso
  drawSectionTitle('1. Información General del Proceso', 84);
  drawGridRow(
    'Código de Familia:', famCode,
    'Código del Postulante:', (postulacion.tipoAlumno === 'antiguo' && postulacion.codigoAntiguo) ? postulacion.codigoAntiguo : 'N/A (Alumno Nuevo)',
    92
  );
  drawGridRow(
    'Año Escolar / Lectivo:', postulacion.anoProceso || '2027',
    'Fecha de Registro:', record?.createdAt ? new Date(record.createdAt).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE'),
    97.5
  );
  drawGridRow(
    'Estado de la Ficha:', translateStatus(record?.status),
    'Canal de Captación:', fichaFamilia?.comoEntero || 'No especificado',
    103
  );

  // Section 2: Datos de la Postulación
  drawSectionTitle('2. Datos de la Postulación', 115);
  drawGridRow(
    'Nivel Educativo:', postulacion.nivelEducativo || 'No especificado',
    'Grado de Ingreso:', postulacion.gradoIngreso || 'No especificado',
    123
  );
  drawGridRow(
    'Sede / Local Elegido:', postulacion.sedeLocal || 'Sede Principal',
    'Distrito de la Sede:', postulacion.distritoPostulacion || 'No especificado',
    128.5
  );
  drawGridRow(
    'Turno de Preferencia:', postulacion.turnoPreferencia || 'Mañana',
    'Tipo de Postulante:', (postulacion.tipoAlumno || 'nuevo').toUpperCase(),
    134
  );

  // Section 3: Datos Personales del Postulante
  drawSectionTitle('3. Datos Personales del Postulante', 146);
  drawGridRow(
    'Nombres Completos:', personales.nombres || 'No especificado',
    'Apellido Paterno:', personales.apellidoPaterno || 'No especificado',
    154
  );
  drawGridRow(
    'Apellido Materno:', personales.apellidoMaterno || 'No especificado',
    'Documento Identidad:', `${personales.tipoDocumento || 'DNI'} - ${personales.numeroDocumento || 'N/A'}`,
    159.5
  );
  drawGridRow(
    'Género:', personales.genero || 'No especificado',
    'Fecha Nacimiento:', personales.fechaNacimiento || 'No especificado',
    165
  );
  drawGridRow(
    'Colegio de Procedencia:', personales.colegioProcedencia || 'Ninguno',
    'Tipo de Colegio:', personales.tipoColegioProcedencia || 'Particular',
    170.5
  );
  drawGridRow(
    'Distrito del Colegio:', personales.nivelGradoProcedencia || 'No especificado',
    'Celular Postulante:', personales.celularContacto || 'No registrado',
    176
  );

  // Section 4: Lugar de Nacimiento & Domicilio
  drawSectionTitle('4. Lugar de Nacimiento & Domicilio', 188);
  drawGridRow(
    'País de Nacimiento:', lugarAdicionales.paisNacimiento || 'Perú',
    'Departamento / Región:', lugarAdicionales.departamento || 'Lima',
    196
  );
  drawGridRow(
    'Provincia:', lugarAdicionales.provincia || 'Lima',
    'Distrito Nacimiento:', lugarAdicionales.distrito || 'El Agustino',
    201.5
  );
  drawGridRow(
    'Lugar de Nacimiento:', lugarAdicionales.lugarNacimiento || 'No especificado',
    'Dirección Domiciliaria:', fichaFamilia?.direccionResidencia || 'No declarada',
    207
  );
  drawGridRow(
    'Urbanización / Zona:', fichaFamilia?.urbanizacionZona || 'No declarada',
    'Distrito Residencia:', fichaFamilia?.distrito || 'No declarado',
    212.5
  );
  drawGridRow(
    'Estado Civil Padres:', fichaFamilia?.estadoCivilPadres || 'Casado(a)',
    'Teléfono Fijo / Fam:', fichaFamilia?.telefonoContacto || 'No registrado',
    218
  );
  drawGridRow(
    'Correo de Contacto:', fichaFamilia?.correoContacto || 'No registrado',
    'Por qué elige el Colegio:', fichaFamilia?.porQueDeseaIngresar ? (fichaFamilia.porQueDeseaIngresar.length > 30 ? fichaFamilia.porQueDeseaIngresar.substring(0, 27) + '...' : fichaFamilia.porQueDeseaIngresar) : 'No especificado',
    223.5
  );


  // ==========================================
  // PAGE 2: SALUD, RELIGIÓN, PADRES Y APODERADO
  // ==========================================
  doc.addPage();
  drawPageBorders(2);

  // Page Title Bar
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 12, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EXPEDIENTE COMPLETO - SECCIÓN INFORMACIÓN COMPLEMENTARIA & FAMILIAR', 18, 17.5);

  // Section 5: Información Complementaria y Salud del Estudiante
  drawSectionTitle('5. Información Complementaria y Salud del Estudiante', 29);
  drawGridRow(
    'Cuenta con Seguro:', lugarAdicionales.cuentaSeguro || 'No',
    'Compañía Aseguradora:', (lugarAdicionales.cuentaSeguro === 'Si' && lugarAdicionales.aseguradora) ? lugarAdicionales.aseguradora : 'No aplica',
    37
  );
  drawGridRow(
    'Diagnóstico Médico/Psiq:', lugarAdicionales.tieneDiagnostico || 'No',
    'Detalle de Diagnóstico:', (lugarAdicionales.tieneDiagnostico === 'Si' && lugarAdicionales.diagnosticoDetalle) ? lugarAdicionales.diagnosticoDetalle : 'No aplica',
    42.5
  );
  drawGridRow(
    'Religión:', lugarAdicionales.religion || 'Católica',
    'Asiste a Iglesia:', lugarAdicionales.asisteIglesia || 'No',
    48
  );
  drawGridRow(
    'Nombre de Iglesia:', lugarAdicionales.iglesiaParroquia || 'No aplica',
    'Sacramento: Bautizado:', lugarAdicionales.bautizado ? 'Sí (Declarado)' : 'No',
    53.5
  );
  drawGridRow(
    'Sacramento: 1ra Comunión:', lugarAdicionales.primeraComunion ? 'Sí (Declarado)' : 'No',
    'Con quién vive el menor:', lugarAdicionales.viveCon || 'Padres',
    59
  );

  // Section 6: Datos del Apoderado Legal (Responsable de Matrícula)
  drawSectionTitle('6. Datos del Apoderado Legal (Responsable de Matrícula)', 70);
  
  // Grey legal box note
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 75, 180, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 75, 180, 8, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Nota: El apoderado legal asume toda responsabilidad civil, económica y académica ante la institución.', 18, 80.5);

  drawGridRow(
    'Nombres del Apoderado:', apoderado.nombres || 'No especificado',
    'Parentesco / Relación:', lugarAdicionales.responsableMatricula || 'Apoderado',
    90
  );
  drawGridRow(
    'Apellido Paterno:', apoderado.apellidoPaterno || 'No especificado',
    'Apellido Materno:', apoderado.apellidoMaterno || 'No especificado',
    95.5
  );
  drawGridRow(
    'Documento Identidad:', `${apoderado.tipoDocumento || 'DNI'}: ${apoderado.numeroDocumento || 'N/A'}`,
    'Fecha de Nacimiento:', apoderado.fechaNacimiento || 'No registrada',
    101
  );
  drawGridRow(
    'Celular de Contacto:', apoderado.celularContacto || 'No registrado',
    'Correo Electrónico:', apoderado.correoElectronico || 'No registrado',
    106.5
  );
  drawGridRow(
    'País de Origen:', apoderado.pais || 'Perú',
    'Departamento / Región:', apoderado.departamento || 'Lima',
    112
  );
  drawGridRow(
    'Provincia:', apoderado.provincia || 'Lima',
    'Distrito Residencia:', apoderado.distrito || 'El Agustino',
    117.5
  );
  drawGridRow(
    'Dirección Domicilio:', apoderado.direccionDomicilio ? (apoderado.direccionDomicilio.length > 25 ? apoderado.direccionDomicilio.substring(0, 22) + '...' : apoderado.direccionDomicilio) : 'No especificada',
    'Grado de Instrucción:', apoderado.gradoInstruccion || 'Superior Universitaria',
    123
  );
  drawGridRow(
    'Profesión / Ocupación:', apoderado.profesionOcupacion || 'No declarada',
    'Centro de Trabajo:', apoderado.centroTrabajo || 'No declarado',
    128.5
  );
  drawGridRow(
    'Cargo que Desempeña:', apoderado.cargo || 'No declarado',
    'Horario Laboral:', apoderado.horarioLaboral || 'No declarado',
    134
  );
  drawGridRow(
    'Ingresos Mensuales Prom.:', apoderado.ingresosMensuales || 'No declarados',
    'Fallecido:', apoderado.fallecido ? 'Sí' : 'No',
    139.5
  );

  // Section 7: Información de los Padres (Papá y Mamá)
  drawSectionTitle('7. Información de los Padres Biológicos', 151);

  // Madre (Mama) Column summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATOS DE LA MADRE (MAMÁ):', 15, 159);
  
  doc.setDrawColor(241, 245, 249);
  doc.line(15, 161, 95, 161);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Nombre:', 15, 166);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`${mama.nombres || 'No especificado'} ${mama.apellidoPaterno || ''}`, 35, 166);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Documento:', 15, 171.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`${mama.tipoDocumento || 'DNI'} ${mama.numeroDocumento || 'No declarado'}`, 35, 171.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Celular:', 15, 177);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(mama.celularContacto || 'No registrado', 35, 177);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Correo:', 15, 182.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  const mamaMail = mama.correoElectronico || 'No registrado';
  doc.text(mamaMail.length > 25 ? mamaMail.substring(0, 22) + '...' : mamaMail, 35, 182.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Profesión:', 15, 188);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(mama.profesionOcupacion || 'No declarada', 35, 188);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Estado:', 15, 193.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(mama.fallecido ? 'Finada / Fallecida' : 'Con Vida', 35, 193.5);


  // Padre (Papa) Column summary
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATOS DEL PADRE (PAPÁ):', 110, 159);
  
  doc.line(110, 161, 195, 161);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Nombre:', 110, 166);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`${papa.nombres || 'No especificado'} ${papa.apellidoPaterno || ''}`, 130, 166);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Documento:', 110, 171.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`${papa.tipoDocumento || 'DNI'} ${papa.numeroDocumento || 'No declarado'}`, 130, 171.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Celular:', 110, 177);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(papa.celularContacto || 'No registrado', 130, 177);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Correo:', 110, 182.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  const papaMail = papa.correoElectronico || 'No registrado';
  doc.text(papaMail.length > 25 ? papaMail.substring(0, 22) + '...' : papaMail, 130, 182.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Profesión:', 110, 188);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(papa.profesionOcupacion || 'No declarada', 130, 188);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Estado:', 110, 193.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(papa.fallecido ? 'Finado / Fallecido' : 'Con Vida', 130, 193.5);


  // ==========================================
  // PAGE 3: REQUISITOS, CONTROL INTERNO, OBSERVACIONES & FIRMAS
  // ==========================================
  doc.addPage();
  drawPageBorders(3);

  // Page Title Bar
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 12, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EXPEDIENTE COMPLETO - SECCIÓN CONTROL DEL PROCESO & DECLARACIONES', 18, 17.5);

  // Section 8: Control de Requisitos y Documentos
  drawSectionTitle('8. Estado de Requisitos y Carga de Documentos', 29);
  
  const docs = record?.documents || { dniPostulante: null, dniApoderado: null, libretaEstudios: null, constanciaNoAdeudo: null };
  drawGridRow(
    'DNI del Postulante:', docs.dniPostulante ? 'Cargado (Presentado)' : 'No presentado',
    'DNI del Apoderado:', docs.dniApoderado ? 'Cargado (Presentado)' : 'No presentado',
    37
  );
  drawGridRow(
    'Libreta de Notas:', docs.libretaEstudios ? 'Cargado (Presentado)' : 'No presentado',
    'Constancia de No Adeudo:', docs.constanciaNoAdeudo ? 'Cargado (Presentado)' : 'No presentado',
    42.5
  );

  const docReviewStateText = (record?.status === 'documents_pending') 
    ? 'Pendiente de Presentar Documentos' 
    : (record?.status === 'observed') 
      ? 'Documentación Observada por el Evaluador' 
      : (record?.status === 'documents_submitted') 
        ? 'En Revisión por Secretaría Académica'
        : 'Documentación Completamente Verificada y Aprobada';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Revisión Documentaria:', 15, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(docReviewStateText, 55, 48);

  // Section 9: Información del Proceso y Control de Evaluaciones
  drawSectionTitle('9. Estado del Pago & Control de Evaluaciones', 58);
  
  const paymentText = translatePaymentState(record?.paymentState);
  drawGridRow(
    'Estado del Pago:', paymentText,
    'Código de Pago:', record?.paymentCode || 'Pendiente / No registrado',
    66
  );

  const appt = record?.appointment;
  const apptText = appt ? `${appt.date} a las ${appt.time} (${appt.psychologist || 'Psicólogo JC'})` : 'Pendiente de Reserva / Programación';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Cita Psicopedagógica:', 15, 71.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(apptText, 55, 71.5);

  const evalAcadText = (postulacion.nivelEducativo === 'Inicial' || postulacion.nivelEducativo === 'Guardería y estimulación')
    ? 'No corresponde (Evaluación Exonerada para Inicial)'
    : (record?.academicEvaluation ? `${record.academicEvaluation.dateLabel} - ${record.academicEvaluation.timeSlot}` : 'Pendiente de Asignación');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Evaluación Académica:', 110, 71.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(evalAcadText, 150, 71.5);

  const finalStatusText = translateStatus(record?.status);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text('Estado Final del Proceso:', 15, 77);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(finalStatusText.toUpperCase(), 55, 77);

  // Section 10: Observaciones Registradas por la Institución
  drawSectionTitle('10. Observaciones del Expediente', 87);

  if (record?.status === 'observed') {
    // Red alert box for observations
    doc.setFillColor(254, 242, 242); // bg-rose-50
    doc.rect(15, 93, 180, 20, 'F');
    doc.setDrawColor(252, 165, 165); // border-rose-300
    doc.rect(15, 93, 180, 20, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27); // text-rose-800
    doc.text('EXPEDIENTE CON OBSERVACIONES REQUERIDAS DE ATENCIÓN:', 19, 98);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 29, 29);
    doc.text('El área de Admisión ha observado este expediente debido a problemas de legibilidad, documentos incompletos', 19, 103);
    doc.text('o inconsistencias en los datos cargados. Por favor, inicie sesión en el Portal del Padre y proceda a subir', 19, 107);
    doc.text('el documento correcto o corregir el campo correspondiente para habilitar la cita y evaluación.', 19, 111);
  } else {
    // Neutral slate box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]); // bg-slate-50
    doc.rect(15, 93, 180, 20, 'F');
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]); // border-slate-200
    doc.rect(15, 93, 180, 20, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(47, 55, 75); // text-slate-800
    doc.text('EXPEDIENTE SIN OBSERVACIONES / CONFORMIDAD:', 19, 98);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No se registran penalidades u observaciones administrativas en la postulación. El expediente fluye', 19, 103);
    doc.text('con normalidad a través de los pasos regulares del proceso de matrícula e inducción psicopedagógica.', 19, 107);
    doc.text('Cualquier actualización será enviada directamente al correo electrónico de contacto registrado.', 19, 111);
  }

  // Section 11: Declaración Jurada de Veracidad
  drawSectionTitle('11. Declaración Jurada de Veracidad de la Información', 123);
  
  const disclaimerText = 'El apoderado firmante declara bajo juramento que todos los datos consignados en esta ficha oficial de admisión y expediente completo son rigurosamente verdaderos y se ajustan a la realidad, asumiendo plena responsabilidad administrativa, civil y legal en caso de falsedad u omisión, conforme a las directivas del reglamento interno de admisión de la Institución Educativa Colegio Juventud Científica.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(splitDisclaimer, 15, 131);

  // Section 12: Firmas de Conformidad
  const ySignatures = 155;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(35, ySignatures + 18, 90, ySignatures + 18);
  doc.line(120, ySignatures + 18, 175, ySignatures + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Firma del Apoderado Legal', 62.5, ySignatures + 22, { align: 'center' });
  doc.text('Comisión de Admisión', 147.5, ySignatures + 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text(`DNI: ${apoderado.numeroDocumento || '_________________'}`, 62.5, ySignatures + 25.5, { align: 'center' });
  doc.text('Juventud Científica', 147.5, ySignatures + 25.5, { align: 'center' });

  // Locale Date Stamp at the bottom
  const formattedDateStamp = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  doc.text(`Fecha y hora de generación oficial: Lima, ${formattedDateStamp}`, 15, ySignatures + 35);

  // --- Save / Trigger download ---
  doc.save(fileName);
}
