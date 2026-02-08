/**
 * GALIA Module Components - Barrel Export
 * Gestión de Ayudas LEADER con Inteligencia Artificial
 * 
 * NOTA: Los componentes pesados se importan dinámicamente en GaliaMainTabs.tsx
 * para optimizar el chunking y evitar errores de memoria en el build.
 * NO añadir aquí: GaliaPortalCiudadano, GaliaModeradorCostes, GaliaReportGenerator,
 * GaliaDocumentAnalyzer, GaliaAsistenteVirtual
 */

export { GaliaDashboard } from './GaliaDashboard';
export { GaliaNotificacionesPanel } from './GaliaNotificacionesPanel';
export { GaliaGuiasPasoAPaso } from './GaliaGuiasPasoAPaso';
export { GaliaPlantillasJustificacion } from './GaliaPlantillasJustificacion';
export { GaliaKPICards } from './shared/GaliaKPICards';
export { GaliaStatusBadge } from './shared/GaliaStatusBadge';
