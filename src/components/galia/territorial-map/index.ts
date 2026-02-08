/**
 * GALIA Territorial Map Components
 * Barrel export for interactive Spain map with drill-down
 */

export { GaliaTerritorialMapPanel } from './GaliaTerritorialMapPanel';
export { GaliaSpainMap } from './GaliaSpainMap';
export { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
export { GaliaMapTooltip } from './GaliaMapTooltip';
export { GaliaMapLegend } from './GaliaMapLegend';
export { GaliaRegionalView } from './GaliaRegionalView';
export { GaliaRegionInfoPanel } from './GaliaRegionInfoPanel';
export { GaliaProvinceDetailPanel } from './GaliaProvinceDetailPanel';
export { 
  spainCCAAData, 
  spainProvincesData,
  getCCAAById, 
  getCCAAByTopoId, 
  getProvinceByINECode,
  getProvincesByCCAA,
  getAllCCAAIds, 
  formatCompactCurrency 
} from './spain-paths';
export type { CCAAData, ProvinceData } from './spain-paths';
