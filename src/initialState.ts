import { FormState, FamiliarData } from './types';

const initialFamiliar = (parentesco: string): FamiliarData => ({
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
  horarioLaboral: '',
  pais: 'Perú',
  departamento: 'Lima',
  provincia: 'Lima',
  distrito: 'El Agustino'
});

export const initialFormState: FormState = {
  postulacion: {
    tipoAlumno: 'nuevo',
    codigoAntiguo: '',
    anoProceso: '2027',
    distritoPostulacion: '',
    sedeLocal: '',
    gradoIngreso: '',
    nivelEducativo: '',
    turnoPreferencia: 'Mañana'
  },
  personales: {
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    genero: 'Masculino',
    fechaNacimiento: '',
    colegioProcedencia: '',
    nivelGradoProcedencia: '',
    celularContacto: '',
    tipoColegioProcedencia: 'Colegio Particular'
  },
  lugarAdicionales: {
    paisNacimiento: 'Perú',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'El Agustino',
    lugarNacimiento: '',
    viveCon: 'Padres',
    responsableMatricula: 'Padre',
    cuentaSeguro: 'Si',
    aseguradora: '',
    religion: '',
    iglesiaParroquia: '',
    bautizado: false,
    primeraComunion: false,
    asisteIglesia: '',
    tieneDiagnostico: '',
    diagnosticoDetalle: ''
  },
  fichaFamilia: {
    codigoFamilia: 'FAM-3209',
    nombreFamilia: '',
    direccionResidencia: '',
    urbanizacionZona: '',
    distrito: 'El Agustino',
    estadoCivilPadres: 'Casado(a)',
    telefonoContacto: '',
    correoContacto: '',
    comoEntero: '',
    porQueDeseaIngresar: ''
  },
  padresTutores: {
    papa: initialFamiliar('Papá'),
    mama: initialFamiliar('Mamá'),
    apoderado: {
      ...initialFamiliar('Apoderado'),
      departamento: '',
      provincia: '',
      distrito: ''
    }
  }
};
