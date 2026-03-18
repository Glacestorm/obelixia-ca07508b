/**
 * ERP Entity Types - Tipologías de entidades empresariales
 */

export type CompanyEntityType =
  | 'autonomo'
  | 'sociedad_limitada'
  | 'sociedad_limitada_unipersonal'
  | 'sociedad_anonima'
  | 'sociedad_limitada_nueva_empresa'
  | 'sociedad_cooperativa'
  | 'sociedad_laboral'
  | 'sociedad_colectiva'
  | 'sociedad_comanditaria_simple'
  | 'sociedad_comanditaria_acciones'
  | 'comunidad_bienes'
  | 'sociedad_civil'
  | 'asociacion'
  | 'fundacion'
  | 'sociedad_profesional'
  | 'agrupacion_interes_economico'
  | 'sociedad_anonima_europea'
  | 'sociedad_anonima_deportiva'
  | 'entidad_religiosa'
  | 'trust'
  | 'holding'
  | 'joint_venture'
  | 'ute'
  | 'sucursal_extranjera'
  | 'oficina_representacion';

export interface EntityTypeOption {
  value: CompanyEntityType;
  label: string;
  category: string;
  multiCnae: boolean;
  description: string;
}

export const ENTITY_TYPE_OPTIONS: EntityTypeOption[] = [
  // Personas físicas
  { value: 'autonomo', label: 'Autónomo / Empresario Individual', category: 'Personas Físicas', multiCnae: false, description: 'Persona física con actividad económica propia (RETA)' },
  // Sociedades de Capital
  { value: 'sociedad_limitada', label: 'Sociedad Limitada (SL)', category: 'Sociedades de Capital', multiCnae: false, description: 'Capital mín. 3.000€, responsabilidad limitada' },
  { value: 'sociedad_limitada_unipersonal', label: 'SL Unipersonal (SLU)', category: 'Sociedades de Capital', multiCnae: false, description: 'SL con un único socio' },
  { value: 'sociedad_anonima', label: 'Sociedad Anónima (SA)', category: 'Sociedades de Capital', multiCnae: false, description: 'Capital mín. 60.000€, acciones' },
  { value: 'sociedad_limitada_nueva_empresa', label: 'SL Nueva Empresa (SLNE)', category: 'Sociedades de Capital', multiCnae: false, description: 'SL simplificada, máx. 5 socios' },
  { value: 'sociedad_comanditaria_acciones', label: 'Comanditaria por Acciones', category: 'Sociedades de Capital', multiCnae: false, description: 'Capital en acciones, socios colectivos administran' },
  // Sociedades Personalistas
  { value: 'sociedad_colectiva', label: 'Sociedad Colectiva', category: 'Sociedades Personalistas', multiCnae: false, description: 'Responsabilidad personal, ilimitada y solidaria' },
  { value: 'sociedad_comanditaria_simple', label: 'Comanditaria Simple', category: 'Sociedades Personalistas', multiCnae: false, description: 'Socios colectivos + comanditarios' },
  { value: 'comunidad_bienes', label: 'Comunidad de Bienes (CB)', category: 'Sociedades Personalistas', multiCnae: false, description: 'Propiedad compartida sin personalidad jurídica' },
  { value: 'sociedad_civil', label: 'Sociedad Civil', category: 'Sociedades Personalistas', multiCnae: false, description: 'Contrato de puesta en común de bienes/trabajo' },
  // Economía Social
  { value: 'sociedad_cooperativa', label: 'Sociedad Cooperativa', category: 'Economía Social', multiCnae: false, description: 'Gestión democrática, mín. 3 socios' },
  { value: 'sociedad_laboral', label: 'Sociedad Laboral (SLL/SAL)', category: 'Economía Social', multiCnae: false, description: 'Mayoría capital de los trabajadores' },
  // Entidades sin ánimo de lucro
  { value: 'asociacion', label: 'Asociación', category: 'Sin Ánimo de Lucro', multiCnae: false, description: 'Agrupación para fin común, mín. 3 personas' },
  { value: 'fundacion', label: 'Fundación', category: 'Sin Ánimo de Lucro', multiCnae: false, description: 'Patrimonio afectado a interés general, dotación mín. 30.000€' },
  { value: 'entidad_religiosa', label: 'Entidad Religiosa', category: 'Sin Ánimo de Lucro', multiCnae: false, description: 'Inscrita en Registro de Entidades Religiosas' },
  // Profesionales
  { value: 'sociedad_profesional', label: 'Sociedad Profesional', category: 'Profesionales', multiCnae: false, description: 'Ejercicio colectivo de actividad profesional' },
  // Grupos y Holdings
  { value: 'holding', label: 'Holding', category: 'Grupos Empresariales', multiCnae: true, description: 'Tenencia de participaciones, consolidación fiscal' },
  { value: 'trust', label: 'Trust / Fideicomiso', category: 'Grupos Empresariales', multiCnae: true, description: 'Patrimonio separado, múltiples actividades CNAE' },
  { value: 'agrupacion_interes_economico', label: 'AIE', category: 'Grupos Empresariales', multiCnae: true, description: 'Facilitar actividad económica de sus miembros' },
  // Colaboración temporal
  { value: 'joint_venture', label: 'Joint Venture', category: 'Colaboración', multiCnae: true, description: 'Acuerdo contractual para proyecto común' },
  { value: 'ute', label: 'UTE (Unión Temporal)', category: 'Colaboración', multiCnae: true, description: 'Colaboración temporal para obra/servicio' },
  // Internacional
  { value: 'sociedad_anonima_europea', label: 'SA Europea (SE)', category: 'Internacional', multiCnae: true, description: 'Forma societaria europea, capital mín. 120.000€' },
  { value: 'sucursal_extranjera', label: 'Sucursal Extranjera', category: 'Internacional', multiCnae: false, description: 'Establecimiento permanente de empresa extranjera' },
  { value: 'oficina_representacion', label: 'Oficina de Representación', category: 'Internacional', multiCnae: false, description: 'Presencia sin actividad comercial directa' },
  // Especiales
  { value: 'sociedad_anonima_deportiva', label: 'SAD', category: 'Especiales', multiCnae: false, description: 'SA para competiciones deportivas profesionales' },
];

export const ENTITY_TYPE_CATEGORIES = [
  'Personas Físicas',
  'Sociedades de Capital',
  'Sociedades Personalistas',
  'Economía Social',
  'Sin Ánimo de Lucro',
  'Profesionales',
  'Grupos Empresariales',
  'Colaboración',
  'Internacional',
  'Especiales',
];

export function getEntityTypeOption(type: CompanyEntityType): EntityTypeOption | undefined {
  return ENTITY_TYPE_OPTIONS.find(o => o.value === type);
}

export function isMultiCnaeEntityType(type: CompanyEntityType): boolean {
  return ENTITY_TYPE_OPTIONS.find(o => o.value === type)?.multiCnae ?? false;
}
