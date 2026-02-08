/**
 * Spain Autonomous Communities Data
 * Mapping IDs and metadata for TopoJSON integration
 */

export interface CCAAData {
  id: string;
  topoId: string; // ID in TopoJSON file
  name: string;
  shortName: string;
  provinces: string[];
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

// Get CCAA by our internal ID
export const getCCAAById = (id: string): CCAAData | undefined => {
  return spainCCAAData.find(ccaa => ccaa.id === id);
};

// Get CCAA by TopoJSON ID
export const getCCAAByTopoId = (topoId: string): CCAAData | undefined => {
  return spainCCAAData.find(ccaa => ccaa.topoId === topoId);
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
