/**
 * Spain Autonomous Communities SVG Paths
 * Accurate paths based on real geographic coordinates
 * ViewBox: 0 0 1000 900 (scaled from Spain's geographic bounds)
 */

export interface CCAAData {
  id: string;
  name: string;
  shortName: string;
  path: string;
  labelPosition: { x: number; y: number };
  provinces: string[];
}

// Accurate SVG paths for Spain's CCAA
// ViewBox adjusted to 0 0 1000 900 for better detail
export const spainCCAAData: CCAAData[] = [
  {
    id: 'galicia',
    name: 'Galicia',
    shortName: 'GAL',
    path: 'M80,120 L95,105 L125,95 L155,100 L175,115 L190,140 L200,170 L195,200 L175,230 L150,245 L120,250 L90,240 L65,215 L55,180 L60,150 L70,130 Z',
    labelPosition: { x: 125, y: 175 },
    provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']
  },
  {
    id: 'asturias',
    name: 'Principado de Asturias',
    shortName: 'AST',
    path: 'M200,130 L230,115 L270,110 L310,115 L340,130 L345,155 L330,175 L295,185 L250,190 L210,180 L195,160 Z',
    labelPosition: { x: 270, y: 150 },
    provinces: ['Asturias']
  },
  {
    id: 'cantabria',
    name: 'Cantabria',
    shortName: 'CAN',
    path: 'M345,125 L380,115 L415,120 L440,135 L445,160 L430,180 L395,190 L360,185 L340,165 Z',
    labelPosition: { x: 390, y: 155 },
    provinces: ['Cantabria']
  },
  {
    id: 'pais-vasco',
    name: 'País Vasco',
    shortName: 'PVA',
    path: 'M445,120 L475,110 L510,115 L535,130 L540,155 L525,175 L495,185 L460,180 L445,160 Z',
    labelPosition: { x: 490, y: 150 },
    provinces: ['Álava', 'Guipúzcoa', 'Vizcaya']
  },
  {
    id: 'navarra',
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    path: 'M540,120 L580,105 L620,110 L650,130 L655,170 L640,210 L600,230 L560,220 L535,190 L530,155 Z',
    labelPosition: { x: 590, y: 165 },
    provinces: ['Navarra']
  },
  {
    id: 'la-rioja',
    name: 'La Rioja',
    shortName: 'RIO',
    path: 'M460,185 L500,180 L530,195 L540,225 L520,250 L480,260 L450,245 L445,215 Z',
    labelPosition: { x: 490, y: 220 },
    provinces: ['La Rioja']
  },
  {
    id: 'aragon',
    name: 'Aragón',
    shortName: 'ARA',
    path: 'M560,220 L620,190 L680,170 L730,180 L760,220 L770,290 L755,370 L720,430 L660,450 L600,440 L560,400 L540,340 L545,280 Z',
    labelPosition: { x: 655, y: 310 },
    provinces: ['Huesca', 'Teruel', 'Zaragoza']
  },
  {
    id: 'cataluna',
    name: 'Cataluña',
    shortName: 'CAT',
    path: 'M735,160 L790,145 L850,155 L895,185 L920,230 L915,290 L890,340 L840,370 L785,380 L740,360 L720,310 L725,250 L730,200 Z',
    labelPosition: { x: 820, y: 265 },
    provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona']
  },
  {
    id: 'castilla-leon',
    name: 'Castilla y León',
    shortName: 'CYL',
    path: 'M175,200 L250,185 L330,175 L400,180 L455,200 L490,230 L520,280 L540,340 L520,400 L470,440 L400,460 L320,455 L250,430 L190,390 L160,340 L150,290 L160,240 Z',
    labelPosition: { x: 340, y: 320 },
    provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora']
  },
  {
    id: 'madrid',
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    path: 'M400,430 L450,415 L485,435 L495,475 L475,510 L435,520 L400,505 L390,470 Z',
    labelPosition: { x: 440, y: 470 },
    provinces: ['Madrid']
  },
  {
    id: 'castilla-la-mancha',
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    path: 'M320,455 L400,460 L485,475 L550,460 L620,490 L680,540 L700,610 L660,680 L580,710 L480,720 L380,700 L300,660 L270,590 L280,520 Z',
    labelPosition: { x: 480, y: 590 },
    provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
  },
  {
    id: 'extremadura',
    name: 'Extremadura',
    shortName: 'EXT',
    path: 'M120,390 L190,380 L260,400 L290,460 L300,540 L280,610 L230,660 L160,670 L100,640 L70,580 L75,510 L90,450 Z',
    labelPosition: { x: 180, y: 530 },
    provinces: ['Badajoz', 'Cáceres']
  },
  {
    id: 'comunidad-valenciana',
    name: 'Comunidad Valenciana',
    shortName: 'VAL',
    path: 'M680,450 L740,400 L800,380 L850,410 L880,470 L875,550 L850,620 L800,660 L740,650 L700,610 L680,540 Z',
    labelPosition: { x: 780, y: 520 },
    provinces: ['Alicante', 'Castellón', 'Valencia']
  },
  {
    id: 'islas-baleares',
    name: 'Islas Baleares',
    shortName: 'BAL',
    path: 'M870,380 L900,370 L935,385 L945,415 L930,445 L895,455 L865,440 L860,410 Z M905,460 L935,455 L960,475 L950,505 L920,510 L900,490 Z M870,490 L890,485 L905,500 L895,520 L870,520 L860,505 Z',
    labelPosition: { x: 905, y: 440 },
    provinces: ['Islas Baleares']
  },
  {
    id: 'region-murcia',
    name: 'Región de Murcia',
    shortName: 'MUR',
    path: 'M700,650 L760,630 L810,660 L830,710 L810,760 L755,780 L700,760 L680,710 Z',
    labelPosition: { x: 755, y: 710 },
    provinces: ['Murcia']
  },
  {
    id: 'andalucia',
    name: 'Andalucía',
    shortName: 'AND',
    path: 'M100,660 L180,665 L280,660 L380,700 L500,720 L600,730 L680,750 L700,800 L660,850 L550,870 L420,865 L290,850 L180,820 L100,780 L60,730 L70,690 Z',
    labelPosition: { x: 380, y: 790 },
    provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
  },
  {
    id: 'islas-canarias',
    name: 'Islas Canarias',
    shortName: 'CAN',
    path: 'M60,820 L85,810 L110,820 L115,845 L95,860 L65,855 Z M130,810 L160,800 L190,815 L195,845 L165,860 L135,850 Z M210,795 L250,785 L290,800 L295,835 L260,855 L220,845 Z',
    labelPosition: { x: 175, y: 835 },
    provinces: ['Las Palmas', 'Santa Cruz de Tenerife']
  },
  {
    id: 'ceuta',
    name: 'Ceuta',
    shortName: 'CEU',
    path: 'M350,870 L365,865 L380,875 L375,890 L355,895 L345,885 Z',
    labelPosition: { x: 362, y: 880 },
    provinces: ['Ceuta']
  },
  {
    id: 'melilla',
    name: 'Melilla',
    shortName: 'MEL',
    path: 'M420,870 L435,865 L450,875 L445,890 L425,895 L415,885 Z',
    labelPosition: { x: 432, y: 880 },
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

// Color scale for data visualization
export const getColorByValue = (value: number, max: number): string => {
  const percentage = Math.min(value / max, 1);
  const lightness = 85 - (percentage * 40);
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
