/**
 * Domain D12: AI / Control Tower
 * Multi-agent supervisor, copilot, digital twin, AI governance, ObelixIA
 * 
 * V2-RRHH-FASE-1 Sprint 2: Added knowledge uploader, demo seed
 */

// ── Core AI ──
export { HRAIControlCenter } from '../../HRAIControlCenter';
export { HRAIAgentPanel } from '../../HRAIAgentPanel';
export { MultiAgentSupervisorPanel } from '../../MultiAgentSupervisorPanel';

// ── Copilot & Twin ──
export { HRCopilotTwinPanel } from '../../copilot-twin/HRCopilotTwinPanel';
export { HRDigitalTwinPanel } from '../../digital-twin/HRDigitalTwinPanel';

// ── Governance ──
export { HRAIGovernancePanel } from '../../ai-governance/HRAIGovernancePanel';

// ── Utilities ──
export { HRKnowledgeUploader } from '../../HRKnowledgeUploader';
export { HRDemoSeedPanel } from '../../HRDemoSeedPanel';

// ── Governance Cockpit (S8.5) ──
export { GovernanceCockpit } from './GovernanceCockpit';
