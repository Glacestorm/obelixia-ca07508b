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
export { spainCCAAData, getCCAAById, getAllCCAAIds, formatCompactCurrency } from './spain-paths';
export { provincesByCCAA, getProvincesByCCAA, getProvinceById } from './province-paths';
export type { CCAAData } from './spain-paths';
export type { ProvinceData } from './province-paths';
export type { ProvinceMapData } from './GaliaRegionMap';
