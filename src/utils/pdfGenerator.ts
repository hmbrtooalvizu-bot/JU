import { jsPDF } from 'jspdf';
import { FormState } from '../types';

export function downloadConstanciaPDF(formState: FormState) {
  const { postulacion, personales, lugarAdicionales, fichaFamilia, padresTutores } = formState;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const famCode = fichaFamilia?.codigoFamilia || 'FAM-TEMP';
  const fileName = `Constancia_Admision_${famCode}.pdf`;

  // --- Colors ---
  const primaryColor = [21, 48, 94]; // #15305e (Brand Navy)
  const secondaryColor = [245, 158, 11]; // #f59e0b
  const textColor = [51, 65, 85]; // slate-700
  const darkTextColor = [15, 23, 42]; // slate-900
  const lightBg = [248, 250, 252]; // slate-50
  const lineGray = [226, 232, 240]; // slate-200

  // --- Header ---
  // Background decorative header band
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 15, 'F');
  
  // Footer band
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 287, 210, 10, 'F');

  // School Crest Circular Representation
  doc.setFillColor(255, 255, 255);
  doc.ellipse(105, 30, 16, 16, 'F');
  doc.setLineWidth(0.8);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.ellipse(105, 30, 16, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('JC', 105, 32.5, { align: 'center' });

  // School name & motto
  doc.setFontSize(14);
  doc.text('I.E. JUVENTUD CIENTÍFICA', 105, 52, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('"Ciencia, Disciplina y Valores de Alto Rendimiento"', 105, 57, { align: 'center' });
  doc.text('Autorización Ministerial N° 0451-2015-MINEDU', 105, 61, { align: 'center' });

  // Separator
  doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 66, 195, 66);

  // --- Constancia Title ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 71, 180, 18, 'F');
  doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
  doc.rect(15, 71, 180, 18, 'S');

  // Left accent border line
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(15, 71, 2, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('CONSTANCIA OFICIAL DE REGISTRO DE ADMISIÓN', 21, 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Proceso de Selección de Alumnos - Año Lectivo 2027', 21, 84);

  // Fam Code Badge (Right-aligned inside the rectangle)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EXPEDIENTE:', 190, 78, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(famCode, 190, 84, { align: 'right' });

  let y = 98;

  // --- Section 1: Postulación ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. DATOS DE LA POSTULACIÓN', 15, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y + 2, 195, y + 2);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Grado de Ingreso:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${postulacion.gradoIngreso || 'N/A'} (${postulacion.nivelEducativo || 'N/A'})`, 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Sede / Local:', 115, y);
  doc.setFont('helvetica', 'normal');
  doc.text(postulacion.sedeLocal || 'Sede Principal', 145, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Turno Preferido:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(postulacion.turnoPreferencia || 'Mañana', 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Alumno:', 115, y);
  doc.setFont('helvetica', 'normal');
  doc.text((postulacion.tipoAlumno || 'nuevo').toUpperCase(), 145, y);
  y += 10;

  // --- Section 2: Estudiante ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. INFORMACIÓN DEL POSTULANTE', 15, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, y + 2, 195, y + 2);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Nombres Completos:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${personales.nombres || 'N/A'} ${personales.apellidoPaterno || 'N/A'} ${personales.apellidoMaterno || 'N/A'}`, 50, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Documento Identidad:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${personales.tipoDocumento || 'DNI'}: ${personales.numeroDocumento || 'N/A'}`, 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Género:', 115, y);
  doc.setFont('helvetica', 'normal');
  doc.text(personales.genero || 'N/A', 145, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Nacimiento:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(personales.fechaNacimiento || 'N/A', 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Colegio Procedencia:', 115, y);
  doc.setFont('helvetica', 'normal');
  const procSchool = personales.colegioProcedencia || 'Ninguno';
  doc.text(procSchool.length > 25 ? procSchool.substring(0, 24) + '...' : procSchool, 145, y);
  y += 10;

  // --- Section 3: Datos de Familia & Apoderado ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. DATOS FAMILIARES & APODERADO', 15, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, y + 2, 195, y + 2);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Responsable Legal:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(lugarAdicionales.responsableMatricula || 'Padre', 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección Familiar:', 115, y);
  doc.setFont('helvetica', 'normal');
  const resDir = fichaFamilia?.direccionResidencia || 'No declarada';
  doc.text(resDir.length > 25 ? resDir.substring(0, 24) + '...' : resDir, 145, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono de Contacto:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fichaFamilia?.telefonoContacto || 'N/A', 50, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Correo Electrónico:', 115, y);
  doc.setFont('helvetica', 'normal');
  const resEmail = fichaFamilia?.correoContacto || 'N/A';
  doc.text(resEmail.length > 25 ? resEmail.substring(0, 24) + '...' : resEmail, 145, y);
  y += 7;

  // Sub-block: apoderado details
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, y, 180, 20, 'F');
  doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
  doc.rect(15, y, 180, 20, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('APODERADO FIRMANTE:', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Nombres: ${padresTutores.apoderado.nombres || ''} ${padresTutores.apoderado.apellidoPaterno || ''}`, 18, y + 10);
  doc.text(`Documento: ${padresTutores.apoderado.tipoDocumento || 'DNI'} ${padresTutores.apoderado.numeroDocumento || ''}`, 18, y + 15);
  doc.text(`Celular: ${padresTutores.apoderado.celularContacto || ''}`, 118, y + 10);
  doc.text(`Correo: ${padresTutores.apoderado.correoElectronico || ''}`, 118, y + 15);
  y += 27;

  // --- Section 4: Próximos pasos ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. PRÓXIMAS ETAPAS DEL PROCESO', 15, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, y + 2, 195, y + 2);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  doc.text('1. Subir Documentos:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Suba copias del DNI del postulante, apoderado, libreta de notas y no adeudo.', 50, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('2. Cita Psicológica:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Reserve su cita psicopedagógica virtual desde el portal de seguimiento.', 50, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('3. Matrícula y Aula:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Confirme la matrícula para la asignación de pabellón y aula correspondientes.', 50, y);
  y += 10;

  // --- Disclaimer / Jurisdicción ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('DECLARACIÓN JURADA DE VERACIDAD', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const disclaimerText = 'El apoderado firmante declara bajo juramento que todos los datos consignados en esta ficha oficial de admisión son rigurosamente verdaderos y se ajustan a la realidad, asumiendo plena responsabilidad administrativa y legal en caso de falsedad, conforme a las directivas del reglamento institucional del Colegio Juventud Científica.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
  doc.text(splitDisclaimer, 15, y + 3);
  y += 18;

  // --- Signatures ---
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(40, y + 14, 90, y + 14);
  doc.line(120, y + 14, 170, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Apoderado Legal', 65, y + 18, { align: 'center' });
  doc.text('Comisión de Admisión', 145, y + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('Firma del Solicitante', 65, y + 21, { align: 'center' });
  doc.text('Juventud Científica', 145, y + 21, { align: 'center' });

  // Date
  const formattedDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha de impresión: Lima, ${formattedDate}`, 15, y + 28);

  // --- Save / Trigger download ---
  doc.save(fileName);
}
