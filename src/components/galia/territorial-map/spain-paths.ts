/**
 * Spain Autonomous Communities SVG Paths
 * Optimized paths for interactive map visualization
 * Source: Simplified GeoJSON data for Spain CCAA
 */

export interface CCAAData {
  id: string;
  name: string;
  shortName: string;
  path: string;
  labelPosition: { x: number; y: number };
  provinces: string[];
}

// Simplified SVG viewBox: 0 0 600 500
// Paths optimized for performance while maintaining recognizable shapes
export const spainCCAAData: CCAAData[] = [
  {
    id: 'galicia',
    name: 'Galicia',
    shortName: 'GAL',
    path: 'M45,85 L85,70 L105,85 L115,120 L100,150 L70,165 L40,145 L30,115 Z',
    labelPosition: { x: 70, y: 120 },
    provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']
  },
  {
    id: 'asturias',
    name: 'Principado de Asturias',
    shortName: 'AST',
    path: 'M115,80 L175,65 L195,85 L185,105 L140,115 L115,100 Z',
    labelPosition: { x: 155, y: 90 },
    provinces: ['Asturias']
  },
  {
    id: 'cantabria',
    name: 'Cantabria',
    shortName: 'CAN',
    path: 'M195,70 L240,60 L255,80 L245,100 L210,105 L195,85 Z',
    labelPosition: { x: 225, y: 85 },
    provinces: ['Cantabria']
  },
  {
    id: 'pais-vasco',
    name: 'País Vasco',
    shortName: 'PVA',
    path: 'M255,65 L295,55 L310,75 L300,95 L270,100 L255,80 Z',
    labelPosition: { x: 280, y: 80 },
    provinces: ['Álava', 'Guipúzcoa', 'Vizcaya']
  },
  {
    id: 'navarra',
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    path: 'M310,60 L360,50 L375,80 L365,120 L330,130 L305,100 Z',
    labelPosition: { x: 340, y: 90 },
    provinces: ['Navarra']
  },
  {
    id: 'la-rioja',
    name: 'La Rioja',
    shortName: 'RIO',
    path: 'M270,105 L305,100 L320,125 L295,145 L265,135 Z',
    labelPosition: { x: 290, y: 125 },
    provinces: ['La Rioja']
  },
  {
    id: 'aragon',
    name: 'Aragón',
    shortName: 'ARA',
    path: 'M330,130 L375,80 L420,70 L450,110 L460,180 L430,240 L370,250 L340,200 L320,160 Z',
    labelPosition: { x: 390, y: 160 },
    provinces: ['Huesca', 'Teruel', 'Zaragoza']
  },
  {
    id: 'cataluna',
    name: 'Cataluña',
    shortName: 'CAT',
    path: 'M420,55 L480,45 L530,80 L540,140 L510,180 L460,180 L450,110 Z',
    labelPosition: { x: 480, y: 115 },
    provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona']
  },
  {
    id: 'castilla-leon',
    name: 'Castilla y León',
    shortName: 'CYL',
    path: 'M100,125 L185,105 L245,100 L270,105 L290,145 L320,160 L340,200 L310,240 L250,260 L180,250 L130,220 L90,180 L85,145 Z',
    labelPosition: { x: 200, y: 180 },
    provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora']
  },
  {
    id: 'madrid',
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    path: 'M230,260 L270,245 L290,270 L280,300 L240,305 L220,280 Z',
    labelPosition: { x: 255, y: 275 },
    provinces: ['Madrid']
  },
  {
    id: 'castilla-la-mancha',
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    path: 'M180,250 L250,260 L290,270 L340,250 L400,280 L420,340 L380,390 L300,400 L220,380 L160,340 L150,290 Z',
    labelPosition: { x: 290, y: 330 },
    provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
  },
  {
    id: 'extremadura',
    name: 'Extremadura',
    shortName: 'EXT',
    path: 'M60,250 L130,240 L160,280 L160,340 L130,380 L70,370 L40,320 L45,270 Z',
    labelPosition: { x: 100, y: 310 },
    provinces: ['Badajoz', 'Cáceres']
  },
  {
    id: 'comunidad-valenciana',
    name: 'Comunidad Valenciana',
    shortName: 'VAL',
    path: 'M400,250 L460,200 L510,180 L530,220 L520,290 L480,340 L420,340 Z',
    labelPosition: { x: 470, y: 270 },
    provinces: ['Alicante', 'Castellón', 'Valencia']
  },
  {
    id: 'islas-baleares',
    name: 'Islas Baleares',
    shortName: 'BAL',
    path: 'M540,220 L560,210 L580,225 L575,245 L555,255 L535,245 Z M560,260 L575,255 L585,270 L570,280 L555,270 Z',
    labelPosition: { x: 565, y: 250 },
    provinces: ['Islas Baleares']
  },
  {
    id: 'region-murcia',
    name: 'Región de Murcia',
    shortName: 'MUR',
    path: 'M400,360 L450,345 L480,380 L460,420 L410,430 L380,400 Z',
    labelPosition: { x: 430, y: 385 },
    provinces: ['Murcia']
  },
  {
    id: 'andalucia',
    name: 'Andalucía',
    shortName: 'AND',
    path: 'M70,380 L130,380 L220,380 L300,400 L380,400 L400,430 L380,470 L300,490 L200,480 L100,460 L40,420 L50,390 Z',
    labelPosition: { x: 220, y: 440 },
    provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
  },
  {
    id: 'islas-canarias',
    name: 'Islas Canarias',
    shortName: 'CAN',
    path: 'M20,460 L40,450 L55,460 L50,475 L30,480 Z M65,455 L85,445 L105,455 L100,475 L75,480 Z M115,450 L140,440 L160,455 L155,475 L125,480 Z',
    labelPosition: { x: 90, y: 465 },
    provinces: ['Las Palmas', 'Santa Cruz de Tenerife']
  },
  {
    id: 'ceuta',
    name: 'Ceuta',
    shortName: 'CEU',
    path: 'M175,485 L185,480 L195,485 L190,495 L180,495 Z',
    labelPosition: { x: 185, y: 490 },
    provinces: ['Ceuta']
  },
  {
    id: 'melilla',
    name: 'Melilla',
    shortName: 'MEL',
    path: 'M210,485 L220,480 L230,485 L225,495 L215,495 Z',
    labelPosition: { x: 220, y: 490 },
    provinces: ['Melilla']
  }
];

// Get CCAA by ID
export const getCCAAById = (id: string): CCAAData | undefined => {
  return spainCCAAData.find(ccaa => ccaa.id === id);
};

// Get all CCAA IDs
export const getAllCCAAIds = (): string[] => {
  return spainCCAAData.map(ccaa => ccaa.id);
};

// Color scale for data visualization (HSL values matching theme)
export const getColorByValue = (value: number, max: number): string => {
  const percentage = Math.min(value / max, 1);
  // From light primary to intense primary
  const lightness = 85 - (percentage * 40); // 85% to 45%
  return `hsl(var(--primary) / ${0.3 + percentage * 0.7})`;
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
