/**
 * HR Shared Components - Barrel exports
 */

export { HREmployeeSearchSelect } from './HREmployeeSearchSelect';
export type { EmployeeOption } from './HREmployeeSearchSelect';

// CNO - Clasificación Nacional de Ocupaciones (obligatorio Sistema RED desde 15/02/2022)
export { HRCNOSelect } from './HRCNOSelect';

// Convenio Colectivo - Art. 8.5 ET (obligatorio informar en contratos)
export { HRCollectiveAgreementSelect } from './HRCollectiveAgreementSelect';
export type { AgreementData } from './HRCollectiveAgreementSelect';

// Data governance & role experience
export { DataSourceBadge, resolveDataSource } from './DataSourceBadge';
export type { DataSource } from './DataSourceBadge';
export { RoleAwareDashboard } from './RoleAwareDashboard';
