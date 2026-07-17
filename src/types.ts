export interface PostulacionData {
  tipoAlumno: 'nuevo' | 'antiguo';
  codigoAntiguo: string;
  anoProceso: '2027';
  distritoPostulacion: string;
  sedeLocal: string;
  gradoIngreso: string;
  nivelEducativo: string;
  turnoPreferencia: string;
}

export interface DatosPersonalesData {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: string;
  numeroDocumento: string;
  genero: string;
  fechaNacimiento: string;
  colegioProcedencia: string;
  nivelGradoProcedencia: string;
  celularContacto?: string;
  tipoColegioProcedencia?: string;
}

export interface LugarAdicionalesData {
  paisNacimiento: string;
  departamento: string;
  provincia: string;
  distrito: string;
  lugarNacimiento: string;
  viveCon: string;
  responsableMatricula: 'Padre' | 'Madre' | 'Apoderado';
  cuentaSeguro: 'Si' | 'No';
  aseguradora: string;
  religion: string;
  iglesiaParroquia: string;
  bautizado: boolean;
  primeraComunion: boolean;
  asisteIglesia?: 'Si' | 'No' | '';
  tieneDiagnostico?: 'Si' | 'No' | '';
  diagnosticoDetalle?: string;
}

export interface FichaFamiliaData {
  codigoFamilia: string;
  nombreFamilia: string;
  direccionResidencia: string;
  urbanizacionZona: string;
  distrito: string;
  estadoCivilPadres: string;
  telefonoContacto: string;
  correoContacto: string;
  comoEntero: string;
  porQueDeseaIngresar: string;
}

export interface FamiliarData {
  fallecido: boolean;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  celularContacto: string;
  correoElectronico: string;
  direccionDomicilio: string;
  gradoInstruccion: string;
  profesionOcupacion: string;
  centroTrabajo: string;
  cargo: string;
  ingresosMensuales: string;
  horarioLaboral: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

export interface PadresTutoresData {
  papa: FamiliarData;
  mama: FamiliarData;
  apoderado: FamiliarData;
}

export interface FormState {
  postulacion: PostulacionData;
  personales: DatosPersonalesData;
  lugarAdicionales: LugarAdicionalesData;
  fichaFamilia: FichaFamiliaData;
  padresTutores: PadresTutoresData;
}
