import { FormState } from '../types';

export interface AdmissionRecord {
  id: string;
  username: string;
  password: string;
  status: 'documents_pending' | 'documents_submitted' | 'documents_verified' | 'interview_scheduled' | 'interview_completed' | 'admitted' | 'enrolled' | 'observed' | 'waiting_list';
  paymentState: 'pending' | 'reviewing' | 'paid' | 'rejected';
  paymentAmount: number;
  paymentDate?: string;
  paymentCode?: string;
  paymentComprobante?: string | null;
  appointment?: {
    date: string;
    time: string;
    psychologist?: string;
    dateKey?: string;
    dateLabel?: string;
    timeSlot?: string;
  } | null;
  appointmentApproved?: boolean;
  academicEvaluation?: {
    dateKey: string;
    dateLabel: string;
    timeSlot: string;
  } | null;
  academicEvaluationApproved?: boolean;
  fichaCompletedAt?: string;
  assignedClassroom?: string | null;
  documents: {
    dniPostulante: string | null;
    dniApoderado: string | null;
    libretaEstudios: string | null;
    constanciaNoAdeudo: string | null;
  };
  formState: FormState;
  createdAt: string;
  isDeleted?: boolean; // For soft deletion audit trail
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  recordId?: string;
}

const baseFormTemplate: FormState = {
  postulacion: {
    tipoAlumno: 'nuevo',
    codigoAntiguo: '',
    anoProceso: '2027',
    distritoPostulacion: 'El Agustino',
    sedeLocal: 'Castillo Las Lilas',
    gradoIngreso: 'Inicial 5 años',
    nivelEducativo: 'Inicial',
    turnoPreferencia: 'Mañana'
  },
  personales: {
    nombres: 'Estudiante',
    apellidoPaterno: 'Demo',
    apellidoMaterno: 'Demo',
    tipoDocumento: 'DNI',
    numeroDocumento: '70001000',
    genero: 'Masculino',
    fechaNacimiento: '2021-06-10',
    colegioProcedencia: 'Colegio de Procedencia Sac.',
    nivelGradoProcedencia: 'Inicial 4 años'
  },
  lugarAdicionales: {
    paisNacimiento: 'Perú',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'El Agustino',
    lugarNacimiento: 'Hospital del Niño',
    viveCon: 'Padres',
    responsableMatricula: 'Padre',
    cuentaSeguro: 'Si',
    aseguradora: 'SIS',
    religion: 'Católica',
    iglesiaParroquia: 'Virgen Milagrosa',
    bautizado: true,
    primeraComunion: false
  },
  fichaFamilia: {
    codigoFamilia: 'FAM-3209',
    nombreFamilia: 'Familia Demo',
    direccionResidencia: 'Jr. Sebastian Barranca 312',
    urbanizacionZona: 'La Victoria',
    distrito: 'El Agustino',
    estadoCivilPadres: 'Casado(a)',
    telefonoContacto: '999888777',
    correoContacto: 'correo.contacto@gmail.com',
    comoEntero: 'Feria Educativa',
    porQueDeseaIngresar: 'Alto prestigio científico.'
  },
  padresTutores: {
    papa: {
      fallecido: false,
      nombres: 'Carlos Alberto',
      apellidoPaterno: 'Demo',
      apellidoMaterno: 'Sánchez',
      tipoDocumento: 'DNI',
      numeroDocumento: '10203040',
      fechaNacimiento: '1985-05-15',
      celularContacto: '999888777',
      correoElectronico: 'carlos@gmail.com',
      direccionDomicilio: 'Jr. Sebastian Barranca 312',
      gradoInstruccion: 'Superior Universitaria',
      profesionOcupacion: 'Ingeniero',
      centroTrabajo: 'Empresa Privada',
      cargo: 'Supervisor',
      ingresosMensuales: 'S/. 4,500',
      horarioLaboral: 'Full Time'
    },
    mama: {
      fallecido: false,
      nombres: 'María Elena',
      apellidoPaterno: 'Sánchez',
      apellidoMaterno: 'Castro',
      tipoDocumento: 'DNI',
      numeroDocumento: '40302010',
      fechaNacimiento: '1987-10-20',
      celularContacto: '999111222',
      correoElectronico: 'maria@gmail.com',
      direccionDomicilio: 'Jr. Sebastian Barranca 312',
      gradoInstruccion: 'Superior Universitaria',
      profesionOcupacion: 'Docente',
      centroTrabajo: 'Colegio Estatal',
      cargo: 'Profesora',
      ingresosMensuales: 'S/. 3,200',
      horarioLaboral: 'Mañana'
    },
    apoderado: {
      fallecido: false,
      nombres: 'Carlos Alberto',
      apellidoPaterno: 'Demo',
      apellidoMaterno: 'Sánchez',
      tipoDocumento: 'DNI',
      numeroDocumento: '10203040',
      fechaNacimiento: '1985-05-15',
      celularContacto: '999888777',
      correoElectronico: 'carlos@gmail.com',
      direccionDomicilio: 'Jr. Sebastian Barranca 312',
      gradoInstruccion: 'Superior Universitaria',
      profesionOcupacion: 'Ingeniero',
      centroTrabajo: 'Empresa Privada',
      cargo: 'Supervisor',
      ingresosMensuales: 'S/. 4,500',
      horarioLaboral: 'Full Time'
    }
  }
};

export function getSeededRecords(): AdmissionRecord[] {
  return [
    {
      id: 'FAM-3209',
      username: 'FAM-3209',
      password: '10203040',
      status: 'documents_pending',
      paymentState: 'pending',
      paymentAmount: 0,
      documents: {
        dniPostulante: null,
        dniApoderado: null,
        libretaEstudios: null,
        constanciaNoAdeudo: null
      },
      createdAt: '2026-07-01T10:30:00Z',
      formState: {
        ...baseFormTemplate,
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-3209',
          nombreFamilia: 'Familia Pérez Ramos',
          telefonoContacto: '987654321',
          correoContacto: 'familia.perez@gmail.com'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Mateo Sebastián',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: 'Ramos',
          numeroDocumento: '76543210',
          fechaNacimiento: '2022-04-12',
          colegioProcedencia: 'Nido Mis Primeros Pasos'
        }
      }
    },
    {
      id: 'FAM-4012',
      username: 'FAM-4012',
      password: '20406080',
      status: 'enrolled',
      paymentState: 'paid',
      paymentAmount: 350,
      paymentDate: '2026-07-04',
      assignedClassroom: 'Pabellón A - Aula 101',
      documents: {
        dniPostulante: 'dni_alumno_4012.pdf',
        dniApoderado: 'dni_apoderado_4012.pdf',
        libretaEstudios: 'libreta_4012.jpg',
        constanciaNoAdeudo: 'no_adeudo_4012.pdf'
      },
      createdAt: '2026-07-02T11:45:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: '1er Grado Primaria',
          nivelEducativo: 'Primaria',
          sedeLocal: 'Sede Los Portales',
          distritoPostulacion: 'Santa Anita'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-4012',
          nombreFamilia: 'Familia Quispe Luján',
          telefonoContacto: '944321987',
          correoContacto: 'fam.quispe@outlook.com',
          distrito: 'Santa Anita'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Kiara Valentina',
          apellidoPaterno: 'Quispe',
          apellidoMaterno: 'Luján',
          numeroDocumento: '78129034',
          fechaNacimiento: '2020-08-25',
          colegioProcedencia: 'I.E. Inicial Los Angelitos'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'Rosa Luz',
            apellidoPaterno: 'Luján',
            apellidoMaterno: 'Ríos',
            numeroDocumento: '20406080',
            celularContacto: '944321987',
            correoElectronico: 'rosa.lujan@outlook.com'
          }
        }
      }
    },
    {
      id: 'FAM-9081',
      username: 'FAM-9081',
      password: '30507090',
      status: 'observed',
      paymentState: 'pending',
      paymentAmount: 0,
      documents: {
        dniPostulante: 'dni_temp.pdf',
        dniApoderado: null,
        libretaEstudios: 'notas_ilegibles.png',
        constanciaNoAdeudo: null
      },
      createdAt: '2026-07-03T09:15:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: '1er Año Secundaria',
          nivelEducativo: 'Secundaria',
          sedeLocal: 'Sede Central',
          distritoPostulacion: 'Ate'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-9081',
          nombreFamilia: 'Familia Mendoza Torres',
          telefonoContacto: '912345678',
          correoContacto: 'mendoza.torres@gmail.com',
          distrito: 'Ate'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Thiago Alessandro',
          apellidoPaterno: 'Mendoza',
          apellidoMaterno: 'Torres',
          numeroDocumento: '74291837',
          fechaNacimiento: '2014-11-02',
          colegioProcedencia: 'I.E.P. Mi Pequeño Gran Mundo'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'Héctor Hugo',
            apellidoPaterno: 'Mendoza',
            apellidoMaterno: 'Rojas',
            numeroDocumento: '30507090',
            celularContacto: '912345678',
            correoElectronico: 'hector.mendoza@gmail.com'
          }
        }
      }
    },
    {
      id: 'FAM-1244',
      username: 'FAM-1244',
      password: '45671234',
      status: 'waiting_list',
      paymentState: 'pending',
      paymentAmount: 0,
      documents: {
        dniPostulante: 'dni_p_1244.pdf',
        dniApoderado: 'dni_a_1244.pdf',
        libretaEstudios: 'libreta_1244.pdf',
        constanciaNoAdeudo: 'no_adeudo_1244.pdf'
      },
      createdAt: '2026-07-04T15:20:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: '5to Grado Primaria',
          nivelEducativo: 'Primaria',
          sedeLocal: 'Castillo Las Lilas',
          distritoPostulacion: 'El Agustino'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-1244',
          nombreFamilia: 'Familia Gonzales Huamán',
          telefonoContacto: '955888222',
          correoContacto: 'gonzales.huaman@hotmail.com',
          distrito: 'El Agustino'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Sofía Brigitte',
          apellidoPaterno: 'Gonzales',
          apellidoMaterno: 'Huamán',
          numeroDocumento: '73019283',
          fechaNacimiento: '2016-01-14',
          colegioProcedencia: 'I.E. Juan Pablo II'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'Elena',
            apellidoPaterno: 'Huamán',
            apellidoMaterno: 'Díaz',
            numeroDocumento: '45671234',
            celularContacto: '955888222',
            correoElectronico: 'elena.huaman@hotmail.com'
          }
        }
      }
    },
    {
      id: 'FAM-8812',
      username: 'FAM-8812',
      password: '50607080',
      status: 'interview_scheduled',
      paymentState: 'pending',
      paymentAmount: 0,
      appointment: {
        date: '2026-07-10',
        time: '09:00 AM - 10:00 AM',
        psychologist: 'Dra. Patricia Valdivia'
      },
      documents: {
        dniPostulante: 'doc1.pdf',
        dniApoderado: 'doc2.pdf',
        libretaEstudios: 'doc3.pdf',
        constanciaNoAdeudo: 'doc4.pdf'
      },
      createdAt: '2026-07-05T08:00:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: '3er Año Secundaria',
          nivelEducativo: 'Secundaria',
          sedeLocal: 'Sede Central',
          distritoPostulacion: 'Ate'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-8812',
          nombreFamilia: 'Familia Flores Sotomayor',
          telefonoContacto: '987321654',
          correoContacto: 'flores.soto@gmail.com',
          distrito: 'Ate'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Álvaro Joaquín',
          apellidoPaterno: 'Flores',
          apellidoMaterno: 'Sotomayor',
          numeroDocumento: '71928374',
          fechaNacimiento: '2012-07-08',
          colegioProcedencia: 'Colegio Trilce Ate'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'Marcos',
            apellidoPaterno: 'Flores',
            apellidoMaterno: 'Benites',
            numeroDocumento: '50607080',
            celularContacto: '987321654',
            correoElectronico: 'marcos.flores@gmail.com'
          }
        }
      }
    },
    {
      id: 'FAM-2349',
      username: 'FAM-2349',
      password: '32918273',
      status: 'admitted',
      paymentState: 'pending',
      paymentAmount: 350,
      documents: {
        dniPostulante: 'dni2349.pdf',
        dniApoderado: 'apoderado2349.pdf',
        libretaEstudios: 'libreta2349.pdf',
        constanciaNoAdeudo: 'adeudo2349.pdf'
      },
      createdAt: '2026-07-05T14:10:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: 'Inicial 4 años',
          nivelEducativo: 'Inicial',
          sedeLocal: 'Castillo Las Lilas',
          distritoPostulacion: 'El Agustino'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-2349',
          nombreFamilia: 'Familia Ramírez Farfán',
          telefonoContacto: '944777111',
          correoContacto: 'ramirez.farfan@gmail.com',
          distrito: 'El Agustino'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Valentina Lucía',
          apellidoPaterno: 'Ramírez',
          apellidoMaterno: 'Farfán',
          numeroDocumento: '75839218',
          fechaNacimiento: '2023-03-30',
          colegioProcedencia: 'Nido Colorín Colorado'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'José Luis',
            apellidoPaterno: 'Ramírez',
            apellidoMaterno: 'Castillo',
            numeroDocumento: '32918273',
            celularContacto: '944777111',
            correoElectronico: 'jose.ramirez@gmail.com'
          }
        }
      }
    },
    {
      id: 'FAM-7711',
      username: 'FAM-7711',
      password: '12837492',
      status: 'documents_verified',
      paymentState: 'pending',
      paymentAmount: 0,
      documents: {
        dniPostulante: 'verified_dni_p.pdf',
        dniApoderado: 'verified_dni_a.pdf',
        libretaEstudios: 'verified_libreta.pdf',
        constanciaNoAdeudo: 'verified_adeudo.pdf'
      },
      createdAt: '2026-07-06T11:05:00Z',
      formState: {
        ...baseFormTemplate,
        postulacion: {
          ...baseFormTemplate.postulacion,
          gradoIngreso: '3er Grado Primaria',
          nivelEducativo: 'Primaria',
          sedeLocal: 'Sede Los Portales',
          distritoPostulacion: 'Santa Anita'
        },
        fichaFamilia: {
          ...baseFormTemplate.fichaFamilia,
          codigoFamilia: 'FAM-7711',
          nombreFamilia: 'Familia Alva Guerrero',
          telefonoContacto: '911000333',
          correoContacto: 'fam.alva@gmail.com',
          distrito: 'Santa Anita'
        },
        personales: {
          ...baseFormTemplate.personales,
          nombres: 'Bruno Gabriel',
          apellidoPaterno: 'Alva',
          apellidoMaterno: 'Guerrero',
          numeroDocumento: '72918374',
          fechaNacimiento: '2018-09-12',
          colegioProcedencia: 'I.E.P. Mi Dulce Despertar'
        },
        padresTutores: {
          ...baseFormTemplate.padresTutores,
          apoderado: {
            ...baseFormTemplate.padresTutores.apoderado,
            nombres: 'Claudia',
            apellidoPaterno: 'Guerrero',
            apellidoMaterno: 'Morales',
            numeroDocumento: '12837492',
            celularContacto: '911000333',
            correoElectronico: 'claudia.guerrero@gmail.com'
          }
        }
      }
    }
  ];
}

export function getInitialAuditLogs(): AuditLogEntry[] {
  return [
    {
      id: 'AUD-001',
      timestamp: '2026-07-01T10:35:00Z',
      user: 'Pérez Ramos (FAM-3209)',
      action: 'Creación de Expediente',
      details: 'Registro inicial de la Ficha de Admisión para Mateo Sebastián Pérez Ramos.',
      recordId: 'FAM-3209'
    },
    {
      id: 'AUD-002',
      timestamp: '2026-07-02T12:00:00Z',
      user: 'Quispe Luján (FAM-4012)',
      action: 'Carga de Documentos',
      details: 'Carga completa de requisitos: DNI Postulante, DNI Apoderado, Libreta y Constancia de No Adeudo.',
      recordId: 'FAM-4012'
    },
    {
      id: 'AUD-003',
      timestamp: '2026-07-04T10:00:00Z',
      user: 'admin',
      action: 'Validación de Documentos',
      details: 'Se marcaron como correctos y verificados los documentos del expediente FAM-4012.',
      recordId: 'FAM-4012'
    },
    {
      id: 'AUD-004',
      timestamp: '2026-07-04T16:30:00Z',
      user: 'admin',
      action: 'Aprobación de Admisión',
      details: 'Cambio de estado a "Admitido" tras verificar entrevista satisfactoria para el expediente FAM-4012.',
      recordId: 'FAM-4012'
    },
    {
      id: 'AUD-005',
      timestamp: '2026-07-04T17:15:00Z',
      user: 'Quispe Luján (FAM-4012)',
      action: 'Pago & Matrícula',
      details: 'Confirmación de matrícula y abono del derecho de ingreso de S/. 350. Aula asignada: Pabellón A - 101.',
      recordId: 'FAM-4012'
    },
    {
      id: 'AUD-006',
      timestamp: '2026-07-05T09:00:00Z',
      user: 'Mendoza Torres (FAM-9081)',
      action: 'Observación de Expediente',
      details: 'Se marcó el expediente con estado Observado debido a libreta de notas con imágenes ilegibles.',
      recordId: 'FAM-9081'
    }
  ];
}
