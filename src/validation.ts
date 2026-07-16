import { FormState, FamiliarData } from './types';

export interface ValidationErrors {
  [key: string]: string;
}

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateNumeric = (value: string): boolean => {
  return /^\d+$/.test(value);
};

export const validateStep = (step: number, state: FormState, isSimple?: boolean): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (isSimple) {
    if (step === 1) {
      const { distritoPostulacion, sedeLocal, gradoIngreso, nivelEducativo } = state.postulacion;
      if (!distritoPostulacion) {
        errors.distritoPostulacion = "Debe seleccionar un distrito de postulación.";
      }
      if (!sedeLocal) {
        errors.sedeLocal = "Debe seleccionar una sede o local escolar.";
      }
      if (!gradoIngreso) {
        errors.gradoIngreso = "Debe seleccionar el grado de ingreso.";
      }
      if (!nivelEducativo) {
        errors.nivelEducativo = "Debe seleccionar el nivel educativo.";
      }
    }

    if (step === 2) {
      // For simple registration, Step 2 is now the Apoderado/Contact info (saved in padresTutores.apoderado)
      const { nombres, apellidoPaterno, apellidoMaterno, numeroDocumento, celularContacto, correoElectronico, pais, departamento, provincia, distrito } = state.padresTutores.apoderado;
      if (!nombres.trim()) {
        errors.apoderado_nombres = "El nombre del apoderado o contacto es obligatorio.";
      }
      if (!apellidoPaterno.trim()) {
        errors.apoderado_apellidoPaterno = "El apellido paterno es obligatorio.";
      }
      if (!apellidoMaterno.trim()) {
        errors.apoderado_apellidoMaterno = "El apellido materno es obligatorio.";
      }
      if (!numeroDocumento.trim()) {
        errors.apoderado_numeroDocumento = "El número de documento es obligatorio.";
      } else if (!validateNumeric(numeroDocumento)) {
        errors.apoderado_numeroDocumento = "Debe contener solo dígitos numéricos.";
      } else if (numeroDocumento.length < 8) {
        errors.apoderado_numeroDocumento = "Debe tener al menos 8 dígitos.";
      }
      if (!celularContacto.trim()) {
        errors.apoderado_celularContacto = "El número celular es obligatorio.";
      } else if (!validateNumeric(celularContacto)) {
        errors.apoderado_celularContacto = "Debe contener solo dígitos numéricos.";
      } else if (celularContacto.length < 9) {
        errors.apoderado_celularContacto = "Debe tener al menos 9 dígitos.";
      }
      if (!correoElectronico.trim()) {
        errors.apoderado_correoElectronico = "El correo electrónico es obligatorio.";
      } else if (!validateEmail(correoElectronico)) {
        errors.apoderado_correoElectronico = "Ingrese un correo electrónico válido.";
      }
      if (!pais || !pais.trim()) {
        errors.apoderado_pais = "El país es obligatorio.";
      }
      if (!departamento || !departamento.trim()) {
        errors.apoderado_departamento = "El departamento es obligatorio.";
      }
      if (!provincia || !provincia.trim()) {
        errors.apoderado_provincia = "La provincia es obligatoria.";
      }
      if (!distrito || !distrito.trim()) {
        errors.apoderado_distrito = "El distrito es obligatorio.";
      }
    }

    if (step === 3) {
      // For simple registration, Step 3 is now the Postulante personal info
      const { nombres, apellidoPaterno, apellidoMaterno, numeroDocumento, fechaNacimiento } = state.personales;
      if (!nombres.trim()) {
        errors.nombres = "El nombre del postulante es obligatorio.";
      }
      if (!apellidoPaterno.trim()) {
        errors.apellidoPaterno = "El apellido paterno es obligatorio.";
      }
      if (!apellidoMaterno.trim()) {
        errors.apellidoMaterno = "El apellido materno es obligatorio.";
      }
      if (!numeroDocumento.trim()) {
        errors.numeroDocumento = "El número de documento es obligatorio.";
      } else if (!validateNumeric(numeroDocumento)) {
        errors.numeroDocumento = "El documento debe contener solo dígitos numéricos.";
      } else if (numeroDocumento.length < 8) {
        errors.numeroDocumento = "El documento debe tener al menos 8 dígitos.";
      }
      if (!fechaNacimiento) {
        errors.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
      }
    }

    return errors;
  }

  if (step === 1) {
    const { distritoPostulacion, sedeLocal, gradoIngreso, nivelEducativo, turnoPreferencia } = state.postulacion;
    if (!distritoPostulacion) {
      errors.distritoPostulacion = "Debe seleccionar un distrito de postulación.";
    }
    if (!sedeLocal) {
      errors.sedeLocal = "Debe seleccionar una sede o local escolar.";
    }
    if (!gradoIngreso) {
      errors.gradoIngreso = "Debe seleccionar el grado de ingreso.";
    }
    if (!nivelEducativo) {
      errors.nivelEducativo = "Debe seleccionar el nivel educativo.";
    }
  }

  if (step === 2) {
    const { nombres, apellidoPaterno, apellidoMaterno, numeroDocumento, fechaNacimiento } = state.personales;
    if (!nombres.trim()) {
      errors.nombres = "El nombre del postulante es obligatorio.";
    }
    if (!apellidoPaterno.trim()) {
      errors.apellidoPaterno = "El apellido paterno es obligatorio.";
    }
    if (!apellidoMaterno.trim()) {
      errors.apellidoMaterno = "El apellido materno es obligatorio.";
    }
    if (!numeroDocumento.trim()) {
      errors.numeroDocumento = "El número de documento es obligatorio.";
    } else if (!validateNumeric(numeroDocumento)) {
      errors.numeroDocumento = "El documento debe contener solo dígitos numéricos.";
    } else if (numeroDocumento.length < 8) {
      errors.numeroDocumento = "El documento debe tener al menos 8 dígitos.";
    }
    if (!fechaNacimiento) {
      errors.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
    } else {
      const birthDate = new Date(fechaNacimiento);
      const today = new Date();
      if (birthDate >= today) {
        errors.fechaNacimiento = "La fecha de nacimiento debe ser anterior a la fecha actual.";
      }
    }
  }

  if (step === 3) {
    const { lugarNacimiento, cuentaSeguro, aseguradora } = state.lugarAdicionales;
    if (!lugarNacimiento.trim()) {
      errors.lugarNacimiento = "Debe especificar el lugar de nacimiento (clínica, hospital o domicilio).";
    }
    if (cuentaSeguro === 'Si' && !aseguradora.trim()) {
      errors.aseguradora = "Debe especificar el nombre de la compañía aseguradora.";
    }
  }

  if (step === 4) {
    const { papa, mama, apoderado } = state.padresTutores;
    const { responsableMatricula } = state.lugarAdicionales;

    const validateFamiliar = (fam: FamiliarData, label: string, isRequired: boolean) => {
      const famErrors: ValidationErrors = {};
      if (fam.fallecido) return famErrors;

      // If it's the responsible party, or if it is a parent who is NOT deceased, let's validate their basic fields.
      // Papá and Mamá are always required unless marked as deceased.
      // Apoderado is required if responsableMatricula is 'Apoderado'.
      if (isRequired) {
        if (!fam.nombres.trim()) {
          famErrors[`${label}_nombres`] = `El nombre de ${label} es obligatorio.`;
        }
        if (!fam.apellidoPaterno.trim()) {
          famErrors[`${label}_apellidoPaterno`] = `El apellido paterno de ${label} es obligatorio.`;
        }
        if (!fam.apellidoMaterno.trim()) {
          famErrors[`${label}_apellidoMaterno`] = `El apellido materno de ${label} es obligatorio.`;
        }
        if (!fam.numeroDocumento.trim()) {
          famErrors[`${label}_numeroDocumento`] = `El documento de ${label} es obligatorio.`;
        } else if (!validateNumeric(fam.numeroDocumento)) {
          famErrors[`${label}_numeroDocumento`] = "Debe contener solo dígitos numéricos.";
        } else if (fam.numeroDocumento.length < 8) {
          famErrors[`${label}_numeroDocumento`] = "Debe tener al menos 8 dígitos.";
        }
        if (!fam.celularContacto.trim()) {
          famErrors[`${label}_celularContacto`] = `El celular de ${label} es obligatorio.`;
        } else if (!validateNumeric(fam.celularContacto)) {
          famErrors[`${label}_celularContacto`] = "Debe contener solo dígitos numéricos.";
        } else if (fam.celularContacto.length < 9) {
          famErrors[`${label}_celularContacto`] = "Debe tener al menos 9 dígitos.";
        }
        if (!fam.correoElectronico.trim()) {
          famErrors[`${label}_correoElectronico`] = `El correo electrónico de ${label} es obligatorio.`;
        } else if (!validateEmail(fam.correoElectronico)) {
          famErrors[`${label}_correoElectronico`] = "Ingrese un correo electrónico válido.";
        }
      }
      return famErrors;
    };

    // Papá is required if not deceased
    const papaErrors = validateFamiliar(papa, 'papa', !papa.fallecido);
    // Mamá is required if not deceased
    const mamaErrors = validateFamiliar(mama, 'mama', !mama.fallecido);
    // Apoderado is required if chosen as primary responsible
    const apoderadoErrors = validateFamiliar(apoderado, 'apoderado', responsableMatricula === 'Apoderado');

    Object.assign(errors, papaErrors, mamaErrors, apoderadoErrors);
  }

  return errors;
};
