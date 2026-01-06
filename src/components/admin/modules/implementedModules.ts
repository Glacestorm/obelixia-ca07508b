// Central list of implemented module keys.
// Keep this list in sync with the modules registered in DynamicModuleRouter.

export const IMPLEMENTED_MODULE_KEYS = new Set<string>([
  // CRM Core
  'crm-companies',
  'crm-contacts',
  'crm-deals',
  'crm-activities',
  'crm-pipeline',
  'crm-omnichannel',
  'crm-sentiment',
  'crm-sla',
  'crm-automation',
  'crm-agents',
  // CRM Modular Dashboard
  'crm-modular',
]);

export function isModuleImplemented(moduleKey?: string | null) {
  return !!moduleKey && IMPLEMENTED_MODULE_KEYS.has(moduleKey);
}
