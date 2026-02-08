/**
 * Spain Autonomous Communities and Provinces Data
 * Mapping IDs and metadata for TopoJSON integration
 */

export interface CCAAData {
  id: string;
  topoId: string; // ID in TopoJSON file
  name: string;
  shortName: string;
  provinces: string[];
}

export interface ProvinceData {
  ineCode: string; // INE code (01-52)
  name: string;
  ccaaId: string; // Reference to parent CCAA
}

// Mapping between our IDs and TopoJSON IDs
export const spainCCAAData: CCAAData[] = [
  {
    id: 'andalucia',
    topoId: '01',
    name: 'Andalucía',
    shortName: 'AND',
    provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
  },
  {
    id: 'aragon',
    topoId: '02',
    name: 'Aragón',
    shortName: 'ARA',
    provinces: ['Huesca', 'Teruel', 'Zaragoza']
  },
  {
    id: 'asturias',
    topoId: '03',
    name: 'Principado de Asturias',
    shortName: 'AST',
    provinces: ['Asturias']
  },
  {
    id: 'islas-baleares',
    topoId: '04',
    name: 'Illes Balears',
    shortName: 'BAL',
    provinces: ['Islas Baleares']
  },
  {
    id: 'islas-canarias',
    topoId: '05',
    name: 'Canarias',
    shortName: 'CAN',
    provinces: ['Las Palmas', 'Santa Cruz de Tenerife']
  },
  {
    id: 'cantabria',
    topoId: '06',
    name: 'Cantabria',
    shortName: 'CTB',
    provinces: ['Cantabria']
  },
  {
    id: 'castilla-leon',
    topoId: '07',
    name: 'Castilla y León',
    shortName: 'CYL',
    provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora']
  },
  {
    id: 'castilla-la-mancha',
    topoId: '08',
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
  },
  {
    id: 'cataluna',
    topoId: '09',
    name: 'Cataluña',
    shortName: 'CAT',
    provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona']
  },
  {
    id: 'comunidad-valenciana',
    topoId: '10',
    name: 'Comunitat Valenciana',
    shortName: 'VAL',
    provinces: ['Alicante', 'Castellón', 'Valencia']
  },
  {
    id: 'extremadura',
    topoId: '11',
    name: 'Extremadura',
    shortName: 'EXT',
    provinces: ['Badajoz', 'Cáceres']
  },
  {
    id: 'galicia',
    topoId: '12',
    name: 'Galicia',
    shortName: 'GAL',
    provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']
  },
  {
    id: 'madrid',
    topoId: '13',
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    provinces: ['Madrid']
  },
  {
    id: 'region-murcia',
    topoId: '14',
    name: 'Región de Murcia',
    shortName: 'MUR',
    provinces: ['Murcia']
  },
  {
    id: 'navarra',
    topoId: '15',
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    provinces: ['Navarra']
  },
  {
    id: 'pais-vasco',
    topoId: '16',
    name: 'País Vasco',
    shortName: 'PVA',
    provinces: ['Álava', 'Guipúzcoa', 'Vizcaya']
  },
  {
    id: 'la-rioja',
    topoId: '17',
    name: 'La Rioja',
    shortName: 'RIO',
    provinces: ['La Rioja']
  },
  {
    id: 'ceuta',
    topoId: '18',
    name: 'Ciudad Autónoma de Ceuta',
    shortName: 'CEU',
    provinces: ['Ceuta']
  },
  {
    id: 'melilla',
    topoId: '19',
    name: 'Ciudad Autónoma de Melilla',
    shortName: 'MEL',
    provinces: ['Melilla']
  }
];

// Complete list of Spanish provinces with INE codes
export const spainProvincesData: ProvinceData[] = [
  // Andalucía
  { ineCode: '04', name: 'Almería', ccaaId: 'andalucia' },
  { ineCode: '11', name: 'Cádiz', ccaaId: 'andalucia' },
  { ineCode: '14', name: 'Córdoba', ccaaId: 'andalucia' },
  { ineCode: '18', name: 'Granada', ccaaId: 'andalucia' },
  { ineCode: '21', name: 'Huelva', ccaaId: 'andalucia' },
  { ineCode: '23', name: 'Jaén', ccaaId: 'andalucia' },
  { ineCode: '29', name: 'Málaga', ccaaId: 'andalucia' },
  { ineCode: '41', name: 'Sevilla', ccaaId: 'andalucia' },
  // Aragón
  { ineCode: '22', name: 'Huesca', ccaaId: 'aragon' },
  { ineCode: '44', name: 'Teruel', ccaaId: 'aragon' },
  { ineCode: '50', name: 'Zaragoza', ccaaId: 'aragon' },
  // Asturias
  { ineCode: '33', name: 'Asturias', ccaaId: 'asturias' },
  // Baleares
  { ineCode: '07', name: 'Illes Balears', ccaaId: 'islas-baleares' },
  // Canarias
  { ineCode: '35', name: 'Las Palmas', ccaaId: 'islas-canarias' },
  { ineCode: '38', name: 'S.C. Tenerife', ccaaId: 'islas-canarias' },
  // Cantabria
  { ineCode: '39', name: 'Cantabria', ccaaId: 'cantabria' },
  // Castilla y León
  { ineCode: '05', name: 'Ávila', ccaaId: 'castilla-leon' },
  { ineCode: '09', name: 'Burgos', ccaaId: 'castilla-leon' },
  { ineCode: '24', name: 'León', ccaaId: 'castilla-leon' },
  { ineCode: '34', name: 'Palencia', ccaaId: 'castilla-leon' },
  { ineCode: '37', name: 'Salamanca', ccaaId: 'castilla-leon' },
  { ineCode: '40', name: 'Segovia', ccaaId: 'castilla-leon' },
  { ineCode: '42', name: 'Soria', ccaaId: 'castilla-leon' },
  { ineCode: '47', name: 'Valladolid', ccaaId: 'castilla-leon' },
  { ineCode: '49', name: 'Zamora', ccaaId: 'castilla-leon' },
  // Castilla-La Mancha
  { ineCode: '02', name: 'Albacete', ccaaId: 'castilla-la-mancha' },
  { ineCode: '13', name: 'Ciudad Real', ccaaId: 'castilla-la-mancha' },
  { ineCode: '16', name: 'Cuenca', ccaaId: 'castilla-la-mancha' },
  { ineCode: '19', name: 'Guadalajara', ccaaId: 'castilla-la-mancha' },
  { ineCode: '45', name: 'Toledo', ccaaId: 'castilla-la-mancha' },
  // Cataluña
  { ineCode: '08', name: 'Barcelona', ccaaId: 'cataluna' },
  { ineCode: '17', name: 'Girona', ccaaId: 'cataluna' },
  { ineCode: '25', name: 'Lleida', ccaaId: 'cataluna' },
  { ineCode: '43', name: 'Tarragona', ccaaId: 'cataluna' },
  // Comunidad Valenciana
  { ineCode: '03', name: 'Alicante', ccaaId: 'comunidad-valenciana' },
  { ineCode: '12', name: 'Castellón', ccaaId: 'comunidad-valenciana' },
  { ineCode: '46', name: 'Valencia', ccaaId: 'comunidad-valenciana' },
  // Extremadura
  { ineCode: '06', name: 'Badajoz', ccaaId: 'extremadura' },
  { ineCode: '10', name: 'Cáceres', ccaaId: 'extremadura' },
  // Galicia
  { ineCode: '15', name: 'A Coruña', ccaaId: 'galicia' },
  { ineCode: '27', name: 'Lugo', ccaaId: 'galicia' },
  { ineCode: '32', name: 'Ourense', ccaaId: 'galicia' },
  { ineCode: '36', name: 'Pontevedra', ccaaId: 'galicia' },
  // Madrid
  { ineCode: '28', name: 'Madrid', ccaaId: 'madrid' },
  // Murcia
  { ineCode: '30', name: 'Murcia', ccaaId: 'region-murcia' },
  // Navarra
  { ineCode: '31', name: 'Navarra', ccaaId: 'navarra' },
  // País Vasco
  { ineCode: '01', name: 'Álava', ccaaId: 'pais-vasco' },
  { ineCode: '20', name: 'Gipuzkoa', ccaaId: 'pais-vasco' },
  { ineCode: '48', name: 'Bizkaia', ccaaId: 'pais-vasco' },
  // La Rioja
  { ineCode: '26', name: 'La Rioja', ccaaId: 'la-rioja' },
  // Ciudades autónomas
  { ineCode: '51', name: 'Ceuta', ccaaId: 'ceuta' },
  { ineCode: '52', name: 'Melilla', ccaaId: 'melilla' }
];

// Get CCAA by our internal ID
export const getCCAAById = (id: string): CCAAData | undefined => {
  return spainCCAAData.find(ccaa => ccaa.id === id);
};

// Get CCAA by TopoJSON ID
export const getCCAAByTopoId = (topoId: string): CCAAData | undefined => {
  return spainCCAAData.find(ccaa => ccaa.topoId === topoId);
};

// Get Province by INE code
export const getProvinceByINECode = (ineCode: string): ProvinceData | undefined => {
  return spainProvincesData.find(p => p.ineCode === ineCode);
};

// Get all provinces for a CCAA
export const getProvincesByCCAA = (ccaaId: string): ProvinceData[] => {
  return spainProvincesData.filter(p => p.ccaaId === ccaaId);
};

// Get all CCAA IDs
export const getAllCCAAIds = (): string[] => {
  return spainCCAAData.map(ccaa => ccaa.id);
};

// Format currency for map display
export const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B €`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M €`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K €`;
  }
  return `${value.toFixed(0)} €`;
};
