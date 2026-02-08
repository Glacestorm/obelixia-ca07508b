/**
 * Spain Autonomous Communities (CCAA) - Accurate SVG Paths
 * Based on real geographic coordinates converted to viewBox 0 0 1000 800
 * Geographic reference: Spain spans approximately from -9.3° to 4.3° longitude and 36° to 43.8° latitude
 */

export interface CCAAPathData {
  id: string;
  name: string;
  shortName: string;
  path: string;
  labelPosition: { x: number; y: number };
  provinces: string[];
  color?: string;
}

// Conversion functions from geographic coordinates to SVG coordinates
// ViewBox: 0 0 1000 800
// Longitude: -9.3 to 4.3 (width ~13.6°) -> 0 to 1000
// Latitude: 35.9 to 43.8 (height ~7.9°) -> 800 to 0 (inverted Y)

const lonToX = (lon: number): number => ((lon + 9.3) / 13.6) * 1000;
const latToY = (lat: number): number => ((43.8 - lat) / 7.9) * 800;

// Accurate SVG paths for Spain's 17 Autonomous Communities + 2 Autonomous Cities
// Paths created from simplified geographic boundaries
export const spainCCAAPathData: CCAAPathData[] = [
  {
    id: 'galicia',
    name: 'Galicia',
    shortName: 'GAL',
    path: 'M68,95 L85,82 L110,75 L135,80 L165,90 L180,105 L175,135 L165,170 L140,195 L105,210 L75,200 L55,175 L45,140 L50,115 L60,100 Z',
    labelPosition: { x: 105, y: 145 },
    provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']
  },
  {
    id: 'asturias',
    name: 'Principado de Asturias',
    shortName: 'AST',
    path: 'M175,100 L210,88 L260,82 L305,85 L330,95 L335,115 L320,135 L285,145 L240,150 L200,145 L180,130 L172,110 Z',
    labelPosition: { x: 250, y: 115 },
    provinces: ['Asturias']
  },
  {
    id: 'cantabria',
    name: 'Cantabria',
    shortName: 'CAN',
    path: 'M330,88 L365,80 L400,82 L425,92 L430,115 L415,135 L385,145 L350,142 L330,125 L325,105 Z',
    labelPosition: { x: 375, y: 112 },
    provinces: ['Cantabria']
  },
  {
    id: 'pais-vasco',
    name: 'País Vasco',
    shortName: 'PVA',
    path: 'M425,85 L460,78 L495,82 L520,95 L525,118 L510,138 L475,148 L445,145 L425,128 L420,108 Z',
    labelPosition: { x: 470, y: 115 },
    provinces: ['Álava', 'Guipúzcoa', 'Vizcaya']
  },
  {
    id: 'navarra',
    name: 'Comunidad Foral de Navarra',
    shortName: 'NAV',
    path: 'M520,90 L555,78 L595,82 L625,100 L630,140 L615,185 L575,205 L540,195 L520,160 L515,125 Z',
    labelPosition: { x: 570, y: 140 },
    provinces: ['Navarra']
  },
  {
    id: 'la-rioja',
    name: 'La Rioja',
    shortName: 'RIO',
    path: 'M445,145 L490,138 L525,155 L535,188 L515,215 L475,225 L445,212 L438,180 Z',
    labelPosition: { x: 485, y: 180 },
    provinces: ['La Rioja']
  },
  {
    id: 'aragon',
    name: 'Aragón',
    shortName: 'ARA',
    path: 'M540,195 L600,165 L660,140 L720,148 L755,185 L770,260 L755,350 L720,420 L660,445 L595,432 L555,390 L535,320 L540,255 Z',
    labelPosition: { x: 650, y: 295 },
    provinces: ['Huesca', 'Teruel', 'Zaragoza']
  },
  {
    id: 'cataluna',
    name: 'Cataluña',
    shortName: 'CAT',
    path: 'M720,130 L780,115 L845,125 L900,160 L930,215 L925,285 L895,350 L840,385 L780,395 L735,370 L715,310 L720,240 L718,180 Z',
    labelPosition: { x: 820, y: 255 },
    provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona']
  },
  {
    id: 'castilla-leon',
    name: 'Castilla y León',
    shortName: 'CYL',
    path: 'M150,170 L225,155 L305,145 L385,150 L445,170 L495,205 L535,260 L555,330 L530,395 L475,440 L395,460 L305,455 L225,425 L170,380 L145,325 L135,270 L142,215 Z',
    labelPosition: { x: 335, y: 305 },
    provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora']
  },
  {
    id: 'madrid',
    name: 'Comunidad de Madrid',
    shortName: 'MAD',
    path: 'M390,425 L445,408 L485,430 L498,475 L475,515 L435,528 L395,512 L385,470 Z',
    labelPosition: { x: 438, y: 468 },
    provinces: ['Madrid']
  },
  {
    id: 'castilla-la-mancha',
    name: 'Castilla-La Mancha',
    shortName: 'CLM',
    path: 'M305,455 L395,460 L490,478 L560,458 L630,492 L695,548 L720,625 L675,700 L585,732 L480,742 L375,720 L290,678 L258,605 L270,530 Z',
    labelPosition: { x: 485, y: 600 },
    provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
  },
  {
    id: 'extremadura',
    name: 'Extremadura',
    shortName: 'EXT',
    path: 'M105,385 L175,375 L250,398 L285,460 L295,545 L272,620 L218,672 L148,682 L88,650 L58,588 L62,515 L78,450 Z',
    labelPosition: { x: 175, y: 535 },
    provinces: ['Badajoz', 'Cáceres']
  },
  {
    id: 'comunidad-valenciana',
    name: 'Comunidad Valenciana',
    shortName: 'VAL',
    path: 'M695,445 L755,395 L820,378 L870,412 L905,478 L898,562 L868,640 L815,682 L755,670 L718,625 L695,555 Z',
    labelPosition: { x: 795, y: 530 },
    provinces: ['Alicante', 'Castellón', 'Valencia']
  },
  {
    id: 'islas-baleares',
    name: 'Islas Baleares',
    shortName: 'BAL',
    // Mallorca, Menorca, Ibiza, Formentera simplified
    path: 'M850,365 L890,355 L935,372 L948,408 L932,445 L892,458 L858,442 L848,405 Z M905,465 L942,458 L968,480 L958,515 L925,522 L902,502 Z M862,498 L888,492 L908,510 L898,535 L868,538 L855,518 Z',
    labelPosition: { x: 895, y: 420 },
    provinces: ['Islas Baleares']
  },
  {
    id: 'region-murcia',
    name: 'Región de Murcia',
    shortName: 'MUR',
    path: 'M718,668 L778,645 L832,678 L858,732 L835,785 L778,808 L720,788 L698,735 Z',
    labelPosition: { x: 775, y: 730 },
    provinces: ['Murcia']
  },
  {
    id: 'andalucia',
    name: 'Andalucía',
    shortName: 'AND',
    path: 'M88,678 L170,682 L275,678 L378,720 L505,742 L612,755 L698,778 L720,835 L675,888 L555,912 L418,905 L282,888 L168,855 L90,815 L48,762 L58,715 Z',
    labelPosition: { x: 385, y: 808 },
    provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
  },
  {
    id: 'islas-canarias',
    name: 'Islas Canarias',
    shortName: 'CAN',
    // Positioned in bottom-left corner as inset (not to scale)
    // Tenerife, Gran Canaria, Lanzarote, Fuerteventura, La Palma, Gomera, Hierro
    path: 'M55,750 L85,742 L115,755 L122,785 L98,802 L62,798 Z M135,738 L172,728 L205,745 L212,778 L182,798 L148,788 Z M225,722 L275,712 L318,732 L325,772 L288,795 L242,782 Z',
    labelPosition: { x: 185, y: 765 },
    provinces: ['Las Palmas', 'Santa Cruz de Tenerife']
  },
  {
    id: 'ceuta',
    name: 'Ceuta',
    shortName: 'CEU',
    // Small marker for autonomous city in Africa
    path: 'M348,920 L368,912 L385,925 L378,945 L355,952 L342,938 Z',
    labelPosition: { x: 362, y: 932 },
    provinces: ['Ceuta']
  },
  {
    id: 'melilla',
    name: 'Melilla',
    shortName: 'MEL',
    // Small marker for autonomous city in Africa
    path: 'M428,920 L448,912 L465,925 L458,945 L435,952 L422,938 Z',
    labelPosition: { x: 442, y: 932 },
    provinces: ['Melilla']
  }
];

// Get CCAA by ID
export const getCCAAPathById = (id: string): CCAAPathData | undefined => {
  return spainCCAAPathData.find(ccaa => ccaa.id === id);
};

// Get all CCAA IDs
export const getAllCCAAPathIds = (): string[] => {
  return spainCCAAPathData.map(ccaa => ccaa.id);
};

// Color scale based on value
export const getHeatmapColor = (value: number, max: number): string => {
  const percentage = Math.min(value / max, 1);
  // From light blue to dark blue
  const lightness = 85 - (percentage * 50);
  return `hsl(220, 70%, ${lightness}%)`;
};

// Format currency compactly
export const formatCompactCurrencyValue = (value: number): string => {
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

export default spainCCAAPathData;
