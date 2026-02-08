/**
 * GALIA Territorial Map Components
 * Barrel export for interactive Spain map with drill-down
 * Phase 3: Added regional drill-down with provinces
 */

// Main panel (lazy load internally)
export { GaliaTerritorialMapPanel } from './GaliaTerritorialMapPanel';

// National level components
export { GaliaSpainMap } from './GaliaSpainMap';

// Navigation & UI
export { GaliaMapBreadcrumb } from './GaliaMapBreadcrumb';
export { GaliaMapTooltip } from './GaliaMapTooltip';
export { GaliaMapLegend } from './GaliaMapLegend';

// Regional level components (lazy loaded by panel)
// Use: import('./GaliaRegionMap') for dynamic imports
// export { GaliaRegionMap } from './GaliaRegionMap';
// export { GaliaRegionInfoPanel } from './GaliaRegionInfoPanel';

// Data utilities
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
