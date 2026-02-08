/**
 * GALIA Territorial Map Components
 * Barrel export for interactive Spain map with drill-down
 */

export { GaliaTerritorialMapPanel } from './GaliaTerritorialMapPanel';
export { GaliaSpainMapSVG } from './GaliaSpainMapSVG';
export { GaliaRegionMap } from './GaliaRegionMap';
export { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
export { GaliaMapTooltip } from './GaliaMapTooltip';
export { GaliaMapLegend } from './GaliaMapLegend';

// Geographic path data - Real accurate paths
export { realSpainCCAAData, getRealCCAAById, getAllRealCCAAIds, getHeatmapColorScale, formatCompactNumber } from './spain-real-paths';
export type { RealCCAAData } from './spain-real-paths';

// Legacy path data
export { spainCCAAPathData, getCCAAPathById, getAllCCAAPathIds, formatCompactCurrencyValue } from './spain-ccaa-paths';
export { provincesByCCAA, getProvincesByCCAA, getProvinceById } from './province-paths';
export { spainCCAAData, getCCAAById, getAllCCAAIds, formatCompactCurrency } from './spain-paths';

export type { CCAAPathData } from './spain-ccaa-paths';
export type { CCAAData } from './spain-paths';
export type { ProvinceData } from './province-paths';
export type { ProvinceMapData } from './GaliaRegionMap';
