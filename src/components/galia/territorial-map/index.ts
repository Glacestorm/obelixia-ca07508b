/**
 * GALIA Territorial Map Components
 * Barrel export for interactive Spain map with drill-down
 */

export { GaliaTerritorialMapPanel } from './GaliaTerritorialMapPanel';
export { GaliaSpainMap } from './GaliaSpainMap';
export { GaliaRegionMap } from './GaliaRegionMap';
export { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
export { GaliaMapTooltip } from './GaliaMapTooltip';
export { GaliaMapLegend } from './GaliaMapLegend';

// Geographic path data
export { spainCCAAPathData, getCCAAPathById, getAllCCAAPathIds, formatCompactCurrencyValue } from './spain-ccaa-paths';
export { provincesByCCAA, getProvincesByCCAA, getProvinceById } from './province-paths';

// Legacy exports for backward compatibility
export { spainCCAAData, getCCAAById, getAllCCAAIds, formatCompactCurrency } from './spain-paths';

export type { CCAAPathData } from './spain-ccaa-paths';
export type { CCAAData } from './spain-paths';
export type { ProvinceData } from './province-paths';
export type { ProvinceMapData } from './GaliaRegionMap';
