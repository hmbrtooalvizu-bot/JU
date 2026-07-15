export const DISTRITOS = [
  "El Agustino",
  "Villa María del Triunfo",
  "Lurín",
  "San Juan de Lurigancho"
] as const;

export const SEDES_POR_DISTRITO: Record<string, string[]> = {
  "El Agustino": [
    "Cdra 7",
    "Cdra 9",
    "Cdra 14",
    "Cdra 15",
    "Cdra 16",
    "San Carlos",
    "La Corporación",
    "Castillo Las Lilas",
    "Castillo Blanquita"
  ],
  "Villa María del Triunfo": [
    "Pachacútec",
    "José Gálvez"
  ],
  "Lurín": [
    "Villa Alejandro",
    "Claveles"
  ],
  "San Juan de Lurigancho": [
    "Gran Chimú",
    "Castillo Genial",
    "Tiahuanaco"
  ]
};

export const DEFAULT_SEDE_ADDRESSES: Record<string, string> = {
  "Cdra 7": "Av. Riva Agüero N° 720, El Agustino",
  "Cdra 9": "Av. Riva Agüero N° 915, El Agustino",
  "Cdra 14": "Av. Riva Agüero N° 1435, El Agustino",
  "Cdra 15": "Av. Riva Agüero N° 1510, El Agustino",
  "Cdra 16": "Av. Riva Agüero N° 1640, El Agustino",
  "San Carlos": "Jr. San Carlos N° 240, El Agustino",
  "La Corporación": "Calle Las Gardenias N° 180, Urb. La Corporación, El Agustino",
  "Castillo Las Lilas": "Jr. Las Lilas N° 350, El Agustino",
  "Castillo Blanquita": "Av. José Carlos Mariátegui N° 120, El Agustino",
  "Pachacútec": "Av. Pachacútec N° 1580, Villa María del Triunfo",
  "José Gálvez": "Jr. José Gálvez N° 410, Villa María del Triunfo",
  "Villa Alejandro": "Av. Villa Alejandro Mz. B Lote 5, Lurín",
  "Claveles": "Calle Los Claveles N° 320, Lurín",
  "Gran Chimú": "Av. Gran Chimú N° 840, San Juan de Lurigancho",
  "Castillo Genial": "Calle El Castillo N° 105, San Juan de Lurigancho",
  "Tiahuanaco": "Av. Tiahuanaco N° 450, San Juan de Lurigancho"
};

export interface GradoOption {
  value: string;
  label: string;
  nivel: string;
}

export const GRADOS_INGRESO: GradoOption[] = [
  // Guardería y estimulación: desde 18 meses
  { value: "Guardería (desde 18 meses)", label: "Guardería y Estimulación (desde 18 meses)", nivel: "Guardería y estimulación" },
  
  // Inicial: 3, 4 y 5 años
  { value: "Inicial 3 años", label: "Inicial 3 años", nivel: "Inicial" },
  { value: "Inicial 4 años", label: "Inicial 4 años", nivel: "Inicial" },
  { value: "Inicial 5 años", label: "Inicial 5 años", nivel: "Inicial" },
  
  // Primaria: 1ro a 6to
  { value: "Primaria 1ro", label: "Primaria 1er Grado", nivel: "Primaria" },
  { value: "Primaria 2do", label: "Primaria 2do Grado", nivel: "Primaria" },
  { value: "Primaria 3ro", label: "Primaria 3er Grado", nivel: "Primaria" },
  { value: "Primaria 4to", label: "Primaria 4to Grado", nivel: "Primaria" },
  { value: "Primaria 5to", label: "Primaria 5to Grado", nivel: "Primaria" },
  { value: "Primaria 6to", label: "Primaria 6to Grado", nivel: "Primaria" },
  
  // Secundaria: 1ro a 5to
  { value: "Secundaria 1ro", label: "Secundaria 1er Año", nivel: "Secundaria" },
  { value: "Secundaria 2do", label: "Secundaria 2do Año", nivel: "Secundaria" },
  { value: "Secundaria 3ro", label: "Secundaria 3er Año", nivel: "Secundaria" },
  { value: "Secundaria 4to", label: "Secundaria 4to Año", nivel: "Secundaria" },
  { value: "Secundaria 5to", label: "Secundaria 5to Año", nivel: "Secundaria" },
  
  // Nivel PreUniversitario
  { value: "Preuniversitario", label: "Nivel PreUniversitario", nivel: "Nivel PreUniversitario" }
];

export const NIVELES_EDUCATIVOS = [
  "Guardería y estimulación",
  "Inicial",
  "Primaria",
  "Secundaria",
  "Nivel PreUniversitario"
] as const;

export const TURNOS = [
  "Mañana",
  "Tarde"
] as const;

export const TIPOS_DOCUMENTO = ["DNI", "Carné de Extranjería", "Pasaporte"] as const;

export const DEPARTAMENTOS = ["Lima", "Cusco", "Arequipa", "La Libertad", "Piura"] as const;
export const PROVINCIAS = ["Lima", "Cusco", "Arequipa", "Trujillo", "Piura"] as const;
export const DISTRITOS_DOMICILIO = [
  "El Agustino",
  "San Isidro",
  "Miraflores",
  "San Juan de Lurigancho",
  "Villa María del Triunfo",
  "Lurín",
  "Otro"
] as const;

export const GRADOS_INSTRUCCION = [
  "Primaria Completa",
  "Secundaria Completa",
  "Superior Técnica",
  "Superior Universitaria",
  "Postgrado"
] as const;

export const ESTADOS_CIVILES = [
  "Casado(a)",
  "Conviviente",
  "Soltero(a)",
  "Divorciado(a)",
  "Viudo(a)"
] as const;
