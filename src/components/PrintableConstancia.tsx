import React from 'react';
import { FormState } from '../types';
import { ShieldLogo } from './ShieldLogo';

interface PrintableConstanciaProps {
  formState: FormState;
}

export default function PrintableConstancia({ formState }: PrintableConstanciaProps) {
  const { postulacion, personales, lugarAdicionales, fichaFamilia, padresTutores } = formState;

  const getSedeText = () => {
    return postulacion.sedeLocal || 'Sede Principal';
  };

  const getGradoText = () => {
    return `${postulacion.gradoIngreso} (${postulacion.nivelEducativo})`;
  };

  const formattedDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="printable-constancia bg-white text-slate-900 p-8 sm:p-12 font-sans leading-relaxed max-w-4xl mx-auto border-2 border-slate-300 rounded-lg shadow-sm">
      {/* Decorative school emblem & header block */}
      <div className="flex flex-col items-center text-center border-b-2 border-slate-900 pb-6 mb-6">
        <ShieldLogo className="w-20 h-20 mb-2" />
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase">Institución Educativa "Juventud Científica"</h1>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-600 mt-1">"Ciencia, Disciplina y Valores de Alto Rendimiento"</p>
        <p className="text-xs text-slate-500 mt-0.5">Autorización Ministerial N° 0451-2015-MINEDU</p>
      </div>

      {/* Title & unique barcode banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 mb-8 gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-base font-extrabold text-slate-900 uppercase">Constancia de Registro de Admisión</h2>
          <p className="text-xs text-slate-500">Proceso de Selección de Alumnos - Año Lectivo 2027</p>
        </div>
        <div className="text-center flex flex-col items-center">
          {/* Mock Barcode */}
          <div className="flex gap-0.5 items-end justify-center h-8 mb-1">
            <div className="w-0.5 h-full bg-slate-900"></div>
            <div className="w-1.5 h-full bg-slate-900"></div>
            <div className="w-0.5 h-full bg-slate-900"></div>
            <div className="w-1 h-full bg-slate-900"></div>
            <div className="w-0.5 h-full bg-slate-900"></div>
            <div className="w-2 h-full bg-slate-900"></div>
            <div className="w-0.5 h-full bg-slate-900"></div>
            <div className="w-1.5 h-full bg-slate-900"></div>
            <div className="w-0.5 h-full bg-slate-900"></div>
            <div className="w-1 h-full bg-slate-900"></div>
          </div>
          <span className="font-mono text-xs font-extrabold tracking-widest text-slate-900">
            {fichaFamilia?.codigoFamilia || 'FAM-TEMP'}
          </span>
        </div>
      </div>

      {/* Main details sections */}
      <div className="space-y-6">
        {/* Section 1: Postulación */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
            1. Datos de la Postulación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-semibold">Grado de Ingreso:</span>{' '}
              <span className="font-bold text-slate-800">{getGradoText()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Sede / Local:</span>{' '}
              <span className="font-bold text-slate-800">{getSedeText()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Turno de Preferencia:</span>{' '}
              <span className="font-bold text-slate-800">{postulacion.turnoPreferencia || 'Por asignar'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Tipo de Alumno:</span>{' '}
              <span className="font-bold text-slate-800 uppercase">{postulacion.tipoAlumno}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Estudiante */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
            2. Información del Postulante
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-semibold">Nombres y Apellidos Completos:</span>{' '}
              <span className="font-bold text-slate-800">
                {personales.nombres} {personales.apellidoPaterno} {personales.apellidoMaterno}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Documento de Identidad:</span>{' '}
              <span className="font-bold text-slate-800">
                {personales.tipoDocumento} - {personales.numeroDocumento}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Fecha de Nacimiento:</span>{' '}
              <span className="font-bold text-slate-800">{personales.fechaNacimiento}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Género:</span>{' '}
              <span className="font-bold text-slate-800 capitalize">{personales.genero}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Colegio de Procedencia:</span>{' '}
              <span className="font-bold text-slate-800">{personales.colegioProcedencia || 'Ninguno'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Padres / Apoderado */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
            3. Datos Familiares & Apoderado
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs mb-3">
            <div>
              <span className="text-slate-400 font-semibold">Responsable del Alumno:</span>{' '}
              <span className="font-bold text-slate-800">
                {lugarAdicionales.responsableMatricula} ({lugarAdicionales.viveCon ? `Vive con: ${lugarAdicionales.viveCon}` : ''})
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Dirección de Residencia:</span>{' '}
              <span className="font-bold text-slate-800">{fichaFamilia?.direccionResidencia || 'No declarada'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Teléfono de Residencia:</span>{' '}
              <span className="font-bold text-slate-800">{fichaFamilia?.telefonoContacto || 'No declarado'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Correo Familiar de Contacto:</span>{' '}
              <span className="font-bold text-slate-800">{fichaFamilia?.correoContacto || 'No declarado'}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
            <h4 className="text-[11px] font-extrabold text-slate-700 uppercase mb-2">Apoderado Firmante:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-400">Apellidos y Nombres:</span>{' '}
                <span className="font-bold text-slate-800">
                  {padresTutores.apoderado.nombres} {padresTutores.apoderado.apellidoPaterno} {padresTutores.apoderado.apellidoMaterno}
                </span>
              </div>
              <div>
                <span className="text-slate-400">DNI / Documento:</span>{' '}
                <span className="font-bold text-slate-800">
                  {padresTutores.apoderado.tipoDocumento} - {padresTutores.apoderado.numeroDocumento}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Celular de Contacto:</span>{' '}
                <span className="font-bold text-slate-800">{padresTutores.apoderado.celularContacto}</span>
              </div>
              <div>
                <span className="text-slate-400">Correo Electrónico:</span>{' '}
                <span className="font-bold text-slate-800">{padresTutores.apoderado.correoElectronico}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-[10px] text-slate-500 text-justify leading-relaxed">
            <strong>Declaración Jurada de Veracidad:</strong> El apoderado firmante declara bajo juramento que todos los datos consignados en esta ficha oficial de admisión son rigurosamente verdaderos y se ajustan a la realidad, asumiendo plena responsabilidad administrativa y legal en caso de falsedad, conforme a las directivas del reglamento institucional del Colegio Juventud Científica.
          </p>
        </div>
      </div>

      {/* Date & signatures */}
      <div className="mt-12 flex flex-col sm:flex-row justify-between items-end gap-10">
        <div className="text-[11px] text-slate-500">
          <span className="block">Ficha generada el:</span>
          <span className="font-bold text-slate-800">{formattedDate}</span>
          <span className="block mt-1">Lugar: Sede de Admisiones, Lima, Perú.</span>
        </div>

        {/* Firmas */}
        <div className="flex gap-8 text-center text-[10px] w-full sm:w-auto justify-end">
          <div className="w-36">
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <span className="block font-bold text-slate-700">Apoderado Legal</span>
            <span className="text-slate-400">Firma del Solicitante</span>
          </div>
          <div className="w-36">
            <div className="h-12 border-b border-slate-400 mb-2"></div>
            <span className="block font-bold text-slate-700">Comisión de Admisión</span>
            <span className="text-slate-400">Juventud Científica</span>
          </div>
        </div>
      </div>
    </div>
  );
}
