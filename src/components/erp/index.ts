// Minimal barrel — only re-export what's consumed outside the erp/ tree.
// Sub-modules should be imported directly (e.g., from './sales') to enable tree-shaking.
export { ERPModularDashboard } from './ERPModularDashboard';
