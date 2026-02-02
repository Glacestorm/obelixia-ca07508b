
# Plan: Módulo Jurídico Enterprise - Asesor IA Multi-Agente

## Resumen Ejecutivo

Implementación de un **Módulo Jurídico integral** que actúa como asesor legal experto para todos los agentes de IA del sistema y el Supervisor. Este módulo centraliza el conocimiento jurídico multi-jurisdiccional y proporciona validación legal en tiempo real para cualquier operación automatizada.

---

## Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                     AGENTE SUPERVISOR                           │
│                  (ai-agent-orchestrator)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  ERP Agents   │ │   HR Agents   │ │  CRM Agents   │
│  (Fiscal,     │ │  (Nóminas,    │ │  (Ventas,     │
│   Contable)   │ │   Contratos)  │ │   GDPR)       │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │     AGENTE JURÍDICO CENTRAL         │
        │    (legal-ai-advisor)               │
        │                                     │
        │  ┌─────────────────────────────┐   │
        │  │    Sub-Agentes Jurídicos    │   │
        │  ├─────────────────────────────┤   │
        │  │ • Laboral                   │   │
        │  │ • Mercantil                 │   │
        │  │ • Fiscal                    │   │
        │  │ • Protección de Datos       │   │
        │  │ • Compliance Bancario       │   │
        │  │ • Contractual               │   │
        │  └─────────────────────────────┘   │
        └─────────────────────────────────────┘
```

---

## Fases de Implementación

### FASE 1: Infraestructura Base de Datos
**Duración estimada**: 1 sesión

**Tablas a crear**:
- `legal_knowledge_base` - Base de conocimiento jurídico multi-jurisdiccional
- `legal_jurisdictions` - Configuración de jurisdicciones (ES, AD, EU, UK, AE, US)
- `legal_case_templates` - Plantillas de casos y contratos por tipo
- `legal_agent_queries` - Historial de consultas de otros agentes
- `legal_validation_logs` - Registro de validaciones legales
- `legal_precedents` - Base de precedentes judiciales
- `legal_regulation_updates` - Actualizaciones normativas monitorizadas

**Índices y triggers**:
- Índices para búsqueda semántica en knowledge base
- Trigger para notificar cambios regulatorios a agentes afectados

---

### FASE 2: Edge Function Principal - Agente Jurídico
**Duración estimada**: 1-2 sesiones

**Archivo**: `supabase/functions/legal-ai-advisor/index.ts`

**Acciones del agente**:
1. `validate_action` - Validar si una acción de otro agente cumple normativa
2. `consult_legal` - Consulta jurídica general con contexto
3. `analyze_contract` - Análisis completo de contratos
4. `check_compliance` - Verificación de cumplimiento multi-normativo
5. `find_precedents` - Búsqueda de precedentes judiciales
6. `generate_document` - Generación de documentos legales
7. `assess_risk` - Evaluación de riesgo legal
8. `monitor_regulations` - Monitoreo de cambios normativos
9. `advise_agent` - Asesoría específica para un agente IA

**Jurisdicciones soportadas**:
- España (Código Civil, Estatuto de los Trabajadores, Ley de Sociedades)
- Andorra (APDA, Codi de Relacions Laborals)
- Unión Europea (GDPR, AI Act, MiFID II, DORA)
- Reino Unido (Employment Rights Act, Companies Act)
- Emiratos Árabes (Free Zone Regulations, UAE Labor Law)
- Estados Unidos (Delaware LLC, California Labor Code)

---

### FASE 3: Hook Principal y Sub-Agentes
**Duración estimada**: 1 sesión

**Archivo**: `src/hooks/admin/legal/useLegalAdvisor.ts`

**Funcionalidades**:
```typescript
interface UseLegalAdvisor {
  // Consultas generales
  consultLegal(query: string, jurisdiction?: string): Promise<LegalAdvice>;
  
  // Validación para otros agentes
  validateAgentAction(agentId: string, action: AgentAction): Promise<ValidationResult>;
  
  // Análisis de contratos
  analyzeContract(contractText: string, type: string): Promise<ContractAnalysis>;
  
  // Cumplimiento normativo
  checkMultiCompliance(regulations: string[]): Promise<ComplianceReport>;
  
  // Precedentes
  findPrecedents(caseType: string, jurisdiction: string): Promise<LegalPrecedent[]>;
  
  // Generación de documentos
  generateLegalDocument(template: string, data: Record<string, unknown>): Promise<Document>;
  
  // Riesgo legal
  assessLegalRisk(scenario: string): Promise<RiskAssessment>;
  
  // Suscripción a cambios regulatorios
  subscribeToRegulationUpdates(jurisdictions: string[]): Subscription;
}
```

**Sub-Agentes especializados** (delegación automática):
- `LaborLegalAgent` - Derecho laboral multi-jurisdiccional
- `CorporateLegalAgent` - Derecho mercantil y societario
- `TaxLegalAgent` - Fiscalidad y tributación
- `DataProtectionAgent` - GDPR, APDA, privacidad
- `BankingComplianceAgent` - MiFID II, Basel, DORA
- `ContractLegalAgent` - Análisis y redacción contractual

---

### FASE 4: Dashboard Jurídico Principal
**Duración estimada**: 1 sesión

**Archivo**: `src/components/admin/legal/LegalAdvisorDashboard.tsx`

**Pestañas del Dashboard**:
1. **Overview** - KPIs, consultas recientes, alertas regulatorias
2. **Consultas** - Chat con el agente jurídico
3. **Contratos** - Análisis y gestión de contratos
4. **Compliance** - Estado de cumplimiento multi-normativo
5. **Precedentes** - Búsqueda de jurisprudencia
6. **Documentos** - Generador de documentos legales
7. **Regulaciones** - Monitor de cambios normativos
8. **Agentes** - Panel de asesoría a otros agentes IA
9. **Validaciones** - Historial de validaciones legales
10. **Riesgos** - Mapa de riesgos legales

---

### FASE 5: Paneles Especializados
**Duración estimada**: 1-2 sesiones

**Componentes a crear**:

1. **LegalQueryPanel.tsx** - Chat especializado con el agente jurídico
2. **ContractAnalysisPanel.tsx** - Análisis IA de contratos con riesgos
3. **LegalCompliancePanel.tsx** - Dashboard de cumplimiento multi-normativo
4. **LegalPrecedentsPanel.tsx** - Búsqueda de jurisprudencia
5. **LegalDocumentGeneratorPanel.tsx** - Generador de documentos
6. **RegulationMonitorPanel.tsx** - Monitor de cambios regulatorios
7. **AgentAdvisoryPanel.tsx** - Panel para asesorar otros agentes
8. **LegalRiskMapPanel.tsx** - Mapa interactivo de riesgos
9. **LegalValidationHistoryPanel.tsx** - Historial de validaciones
10. **LegalKnowledgeBasePanel.tsx** - Gestión de base de conocimiento

---

### FASE 6: Integración con Agente Supervisor
**Duración estimada**: 1 sesión

**Modificaciones necesarias**:

1. **ai-agent-orchestrator** - Añadir delegación automática al Legal Agent
2. **erp-hr-ai-agent** - Integrar validación legal pre-acción
3. **erp-fiscal-ai-agent** - Consulta jurídica para decisiones fiscales
4. **crm-agent-ai** - Validación GDPR en operaciones CRM
5. **useERPModuleAgents.ts** - Añadir dominio "Legal" al orquestador

**Protocolo de comunicación**:
```typescript
interface LegalAdvisoryRequest {
  requesting_agent: string;
  action_type: string;
  context: Record<string, unknown>;
  jurisdictions: string[];
  urgency: 'immediate' | 'standard' | 'scheduled';
}

interface LegalAdvisoryResponse {
  approved: boolean;
  conditions?: string[];
  warnings?: string[];
  legal_basis?: string[];
  recommendations?: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}
```

---

### FASE 7: Base de Conocimiento Jurídico
**Duración estimada**: 1 sesión

**Componentes**:

1. **LegalKnowledgeUploader.tsx** - Carga de documentos jurídicos
2. **Embeddings semánticos** - Para búsqueda inteligente
3. **Categorización automática** - Por jurisdicción, área, vigencia
4. **Sistema de alertas** - Notificación de cambios normativos

**Estructura de conocimiento**:
- Códigos y leyes vigentes
- Convenios colectivos
- Sentencias y precedentes
- Doctrina administrativa
- Circulares y resoluciones
- Contratos tipo homologados

---

### FASE 8: Sistema de Alertas Regulatorias
**Duración estimada**: 1 sesión

**Funcionalidades**:

1. **Monitor de BOE/DOGC/BOPA** - Scraping de boletines oficiales
2. **Detector de cambios** - IA para identificar impacto
3. **Notificación proactiva** - A agentes y usuarios afectados
4. **Timeline de entrada en vigor** - Calendario de obligaciones
5. **Plan de adaptación** - Generación automática de acciones

---

### FASE 9: Reportes y Auditoría Legal
**Duración estimada**: 1 sesión

**Tipos de reportes**:

1. **Due Diligence Report** - Para M&A y operaciones corporativas
2. **Compliance Status Report** - Estado de cumplimiento global
3. **Risk Assessment Report** - Evaluación de riesgos legales
4. **Audit Trail Report** - Historial de validaciones
5. **Regulation Impact Report** - Impacto de nuevas normativas

**Formatos de exportación**: PDF, DOCX, Excel, XML

---

### FASE 10: Tendencias 2026+ y Smart Contracts
**Duración estimada**: 1 sesión

**Funcionalidades avanzadas**:

1. **LegalTrends2026Panel.tsx** - Roadmap de innovación legal
2. **Smart Contract Generator** - Contratos autoejecutables
3. **Blockchain Audit Trail** - Inmutabilidad de validaciones
4. **Predictive Legal Analytics** - Predicción de resultados judiciales
5. **AI Regulatory Sandbox** - Testing de compliance antes de implementar

---

## Sección Técnica

### Estructura de Archivos

```text
src/
├── hooks/admin/legal/
│   ├── useLegalAdvisor.ts          # Hook principal
│   ├── useLegalKnowledge.ts        # Gestión de conocimiento
│   ├── useLegalCompliance.ts       # Cumplimiento normativo
│   ├── useLegalDocuments.ts        # Generación de documentos
│   ├── useLegalPrecedents.ts       # Búsqueda de precedentes
│   ├── useLegalAgentIntegration.ts # Integración con otros agentes
│   └── index.ts                    # Barrel exports
│
├── components/admin/legal/
│   ├── LegalAdvisorDashboard.tsx   # Dashboard principal
│   ├── LegalQueryPanel.tsx         # Chat jurídico
│   ├── ContractAnalysisPanel.tsx   # Análisis de contratos
│   ├── LegalCompliancePanel.tsx    # Cumplimiento
│   ├── LegalPrecedentsPanel.tsx    # Precedentes
│   ├── LegalDocumentGeneratorPanel.tsx
│   ├── RegulationMonitorPanel.tsx  # Monitor regulatorio
│   ├── AgentAdvisoryPanel.tsx      # Asesoría a agentes
│   ├── LegalRiskMapPanel.tsx       # Mapa de riesgos
│   ├── LegalValidationHistoryPanel.tsx
│   ├── LegalKnowledgeBasePanel.tsx
│   ├── LegalTrends2026Panel.tsx    # Tendencias futuras
│   └── index.ts

supabase/
├── functions/
│   ├── legal-ai-advisor/           # Agente principal
│   │   └── index.ts
│   ├── legal-precedent-search/     # Búsqueda de precedentes
│   │   └── index.ts
│   ├── legal-document-generator/   # Generador de documentos
│   │   └── index.ts
│   └── legal-regulation-monitor/   # Monitor de regulaciones
│       └── index.ts
```

### Tablas de Base de Datos

```sql
-- Base de conocimiento jurídico
CREATE TABLE legal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  knowledge_type TEXT NOT NULL, -- 'law', 'regulation', 'precedent', 'doctrine', 'template'
  jurisdiction TEXT NOT NULL,   -- 'ES', 'AD', 'EU', 'UK', 'AE', 'US'
  legal_area TEXT NOT NULL,     -- 'labor', 'corporate', 'tax', 'data_protection', 'banking'
  effective_date DATE,
  expiry_date DATE,
  source_url TEXT,
  tags TEXT[],
  embedding VECTOR(1536),       -- Para búsqueda semántica
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Consultas de agentes
CREATE TABLE legal_agent_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_agent TEXT NOT NULL,
  query_type TEXT NOT NULL,
  query_content JSONB NOT NULL,
  response JSONB,
  approved BOOLEAN,
  risk_level TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validaciones legales
CREATE TABLE legal_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  validation_result JSONB NOT NULL,
  legal_basis TEXT[],
  warnings TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Integración con Supervisor

El Agente Jurídico se registra como dominio especial en el orquestador:

```typescript
// En useERPModuleAgents.ts
const LEGAL_DOMAIN: DomainAgent = {
  id: 'legal-advisor',
  domain: 'legal',
  name: 'Asesor Jurídico IA',
  status: 'active',
  capabilities: [
    'contract_analysis',
    'compliance_check',
    'legal_validation',
    'precedent_search',
    'document_generation',
    'risk_assessment',
    'regulation_monitoring'
  ],
  moduleAgents: [
    { id: 'labor-legal', type: 'labor_law', name: 'Agente Derecho Laboral' },
    { id: 'corporate-legal', type: 'corporate_law', name: 'Agente Derecho Mercantil' },
    { id: 'tax-legal', type: 'tax_law', name: 'Agente Derecho Fiscal' },
    { id: 'data-legal', type: 'data_protection', name: 'Agente Protección Datos' },
    { id: 'banking-legal', type: 'banking_compliance', name: 'Agente Compliance Bancario' },
    { id: 'contract-legal', type: 'contract_law', name: 'Agente Contractual' }
  ]
};
```

---

## Jurisdicciones y Normativas Cubiertas

| Jurisdicción | Área | Normativas Principales |
|--------------|------|------------------------|
| España | Laboral | Estatuto de los Trabajadores, Convenios Colectivos |
| España | Mercantil | Ley de Sociedades de Capital, Código de Comercio |
| España | Fiscal | LIS, LIRPF, LIVA, LGT |
| Andorra | General | APDA, Codi de Relacions Laborals, Llei 95/2010 |
| UE | Datos | GDPR, ePrivacy, AI Act |
| UE | Bancario | MiFID II, Basel III/IV, DORA, CRR/CRD |
| UK | Laboral | Employment Rights Act, Equality Act |
| UAE | Corporativo | Free Zone Regulations, Commercial Companies Law |
| US | Corporativo | Delaware LLC Act, California Labor Code |

---

## Resultado Esperado

Al completar las 10 fases, el sistema dispondrá de:

1. **Agente Jurídico Central** que asesora a todos los demás agentes
2. **Validación legal automática** para cualquier acción automatizada
3. **Base de conocimiento multi-jurisdiccional** actualizada
4. **Sistema de alertas proactivo** ante cambios regulatorios
5. **Generación de documentos legales** con plantillas homologadas
6. **Búsqueda de precedentes judiciales** con IA semántica
7. **Dashboard completo** para gestión jurídica enterprise
8. **Auditoría inmutable** de todas las validaciones legales
9. **Integración nativa** con HR, Fiscal, CRM y demás módulos
10. **Compliance multi-normativo** con reporting automatizado
