
# Plan de Implementacion por Fases: Mejoras Sugeridas en Informe de Auditoria

## Resumen del Alcance

El informe de auditoria identifica las siguientes **areas de mejora pendientes** que deben implementarse para alcanzar paridad completa con los lideres del mercado (SAP, Salesforce, Workday, Oracle, Icertis):

### Mejoras Identificadas por Modulo

**CRM (2 pendientes):**
- Marketing Automation Suite (Campanas multicanal automatizadas)
- Advanced Workflow Builder Visual

**RRHH (3 pendientes):**
- Gig/Contingent Workforce Management
- Total Rewards Statement
- ESG Reporting Social (CSRD/ESRS S1-S4)

**Juridico (2 pendientes):**
- Matter Management Dedicado
- Legal Spend Management (LEDES)

**Roadmap 2026-2027 (8 adicionales):**
- Marketing-Sales Fusion
- Unified Analytics Dashboard
- ESG Suite Completa
- Advanced Cross-Module AI
- Partner/Vendor Portal
- Customer Self-Service Portal
- Industry Cloud Templates
- Global Expansion Pack

---

## FASE 1: Marketing Automation Suite (CRM)
**Duracion estimada: 2-3 semanas**
**Prioridad: CRITICA - Gap competitivo vs. HubSpot/Salesforce**

### Componentes a Crear

```text
src/
  components/
    crm/
      marketing/
        MarketingDashboard.tsx           # Panel principal
        CampaignBuilder.tsx              # Constructor visual de campanas
        CampaignList.tsx                 # Listado de campanas
        EmailTemplateEditor.tsx          # Editor plantillas email
        EmailSequenceBuilder.tsx         # Secuencias automatizadas
        AudienceSegmentBuilder.tsx       # Constructor de segmentos
        CampaignAnalytics.tsx            # Metricas de campanas
        ABTestingPanel.tsx               # Tests A/B
        LeadNurturingFlows.tsx           # Flujos de nurturing
        MarketingCalendar.tsx            # Calendario de campanas
        LandingPageBuilder.tsx           # Constructor landing pages
        FormBuilder.tsx                  # Constructor de formularios
        SocialMediaScheduler.tsx         # Programador redes sociales
        UTMManager.tsx                   # Gestion parametros UTM
        ROITracker.tsx                   # Seguimiento ROI
  hooks/
    crm/
      useMarketingCampaigns.ts           # Hook gestion campanas
      useEmailSequences.ts               # Hook secuencias email
      useAudienceSegments.ts             # Hook segmentos
      useMarketingAnalytics.ts           # Hook analiticas

supabase/
  functions/
    crm-marketing-automation/index.ts    # Orquestador campanas
    crm-email-sequencer/index.ts         # Ejecutor secuencias
    crm-audience-segmentation/index.ts   # Segmentacion IA
```

### Tablas de Base de Datos

```sql
-- Campanas de marketing
CREATE TABLE crm_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- email, social, multichannel
  status VARCHAR(50) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  audience_segment_id UUID,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  goals JSONB,
  metrics JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencias de email
CREATE TABLE crm_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES crm_marketing_campaigns(id),
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50), -- form_submit, tag_added, deal_stage
  steps JSONB NOT NULL, -- Array de pasos con delays y templates
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segmentos de audiencia
CREATE TABLE crm_audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  name VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL, -- Reglas de segmentacion
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de email
CREATE TABLE crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  html_content TEXT,
  plain_content TEXT,
  variables JSONB, -- Variables disponibles
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Funcionalidades Clave
1. Constructor visual de campanas multicanal
2. Secuencias de email con delays configurables
3. Segmentacion de audiencia con reglas dinamicas
4. Editor de templates drag-and-drop
5. Tests A/B automaticos
6. Tracking de conversiones y ROI
7. Integracion con pipeline CRM

---

## FASE 2: Advanced Workflow Builder (CRM)
**Duracion estimada: 2-3 semanas**
**Prioridad: ALTA - Automatizacion empresarial**

### Componentes a Crear

```text
src/
  components/
    crm/
      workflows/
        WorkflowBuilderCanvas.tsx        # Canvas visual principal
        WorkflowNodePalette.tsx          # Paleta de nodos
        WorkflowNode.tsx                 # Componente nodo base
        WorkflowConnection.tsx           # Conexiones entre nodos
        WorkflowTriggerNodes.tsx         # Nodos de trigger
        WorkflowActionNodes.tsx          # Nodos de accion
        WorkflowConditionNodes.tsx       # Nodos de condicion
        WorkflowDelayNodes.tsx           # Nodos de espera
        WorkflowTestRunner.tsx           # Ejecutor de pruebas
        WorkflowHistory.tsx              # Historial de ejecuciones
        WorkflowTemplates.tsx            # Templates predefinidos
```

### Tipos de Nodos

**Triggers:**
- Form Submitted
- Deal Stage Changed
- Contact Created/Updated
- Tag Added/Removed
- Scheduled (Cron)
- Webhook Received
- Email Opened/Clicked

**Actions:**
- Send Email
- Send SMS/WhatsApp
- Create/Update Record
- Add Tag
- Assign to User
- Create Task
- Call Webhook
- Wait/Delay
- Update Deal Stage
- Send Notification

**Conditions:**
- If/Else Branch
- A/B Split
- Filter by Property
- Time-based Condition

---

## FASE 3: Gig/Contingent Workforce Management (RRHH)
**Duracion estimada: 2-3 semanas**
**Prioridad: ALTA - Gap vs. SAP/Workday**

### Componentes a Crear

```text
src/
  components/
    erp/
      hr/
        gig/
          GigWorkforceDashboard.tsx      # Dashboard principal
          ContractorList.tsx             # Listado contractors
          ContractorProfile.tsx          # Perfil contractor
          GigProjectsPanel.tsx           # Proyectos/Gigs
          GigMatchingEngine.tsx          # Motor matching IA
          ContractorOnboarding.tsx       # Onboarding simplificado
          GigPaymentsPanel.tsx           # Gestion pagos
          ContractorCompliancePanel.tsx  # Compliance IR35/TRADE
          FreelancerMarketplace.tsx      # Marketplace interno
          GigAnalyticsPanel.tsx          # Analiticas
          SOWBuilder.tsx                 # Constructor SOW
          TimeTrackingExternal.tsx       # Control horario externos
```

### Tablas de Base de Datos

```sql
-- Contractors/Freelancers
CREATE TABLE erp_hr_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  type VARCHAR(50), -- freelancer, agency, contractor
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  tax_id VARCHAR(50),
  skills JSONB,
  rate_hourly DECIMAL(10,2),
  rate_daily DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'active',
  compliance_status VARCHAR(50), -- ir35_inside, ir35_outside, trade_ok
  documents JSONB,
  rating DECIMAL(3,2),
  total_projects INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos/Gigs
CREATE TABLE erp_hr_gig_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  contractor_id UUID REFERENCES erp_hr_contractors(id),
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  sow_document_id UUID,
  milestones JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos a contractors
CREATE TABLE erp_hr_contractor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES erp_hr_contractors(id),
  project_id UUID REFERENCES erp_hr_gig_projects(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Funcionalidades Clave
1. Gestion de contractors/freelancers
2. Compliance IR35 (UK) / TRADE (ES)
3. SOW (Statement of Work) Builder
4. Matching IA por skills
5. Time tracking para externos
6. Gestion de pagos y facturas
7. Rating y feedback
8. Integracion con Contabilidad

---

## FASE 4: Total Rewards Statement (RRHH)
**Duracion estimada: 1-2 semanas**
**Prioridad: MEDIA - Diferenciador employee experience**

### Componentes a Crear

```text
src/
  components/
    erp/
      hr/
        rewards/
          TotalRewardsPanel.tsx          # Panel principal
          RewardsStatementGenerator.tsx  # Generador statements
          RewardsCategoryBreakdown.tsx   # Desglose categorias
          RewardsVisualization.tsx       # Graficos visuales
          RewardsComparison.tsx          # Comparativa mercado
          RewardsExportPDF.tsx           # Exportar PDF
          BenefitsValueCalculator.tsx    # Calculadora valor
```

### Categorias de Compensacion Total
1. Salario base
2. Bonus y variable
3. Beneficios sociales (seguro medico, vida, pension)
4. Stock options / RSUs
5. Retribucion flexible
6. Formacion patrocinada
7. Dias adicionales vacaciones
8. Otros beneficios (coche, parking, comedor)

---

## FASE 5: ESG Reporting Suite (RRHH + Cross-Module)
**Duracion estimada: 3-4 semanas**
**Prioridad: CRITICA - Regulacion CSRD obligatoria 2025**

### Componentes a Crear

```text
src/
  components/
    erp/
      esg/
        ESGDashboard.tsx                 # Dashboard ESG principal
        ESGDataCollection.tsx            # Recoleccion datos
        ESGSocialMetrics.tsx             # Metricas sociales (ESRS S1-S4)
        ESGEnvironmentalMetrics.tsx      # Metricas ambientales
        ESGGovernanceMetrics.tsx         # Metricas gobernanza
        CSRDReportGenerator.tsx          # Generador informes CSRD
        ESRSComplianceMatrix.tsx         # Matriz compliance ESRS
        CarbonFootprintCalculator.tsx    # Calculadora huella carbono
        DEIMetricsPanel.tsx              # Diversidad e Inclusion
        SupplyChainESG.tsx               # ESG cadena suministro
        ESGRatingsTracker.tsx            # Seguimiento ratings
        GRIReportExporter.tsx            # Export formato GRI
        MaterialityAssessment.tsx        # Analisis materialidad
```

### Tablas de Base de Datos

```sql
-- Metricas ESG
CREATE TABLE erp_esg_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  fiscal_year_id UUID REFERENCES erp_fiscal_years(id),
  category VARCHAR(50), -- environmental, social, governance
  metric_code VARCHAR(50), -- ESRS code
  metric_name VARCHAR(255),
  value DECIMAL(15,4),
  unit VARCHAR(50),
  period_start DATE,
  period_end DATE,
  verified BOOLEAN DEFAULT false,
  verifier VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objetivos ESG
CREATE TABLE erp_esg_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  metric_code VARCHAR(50),
  target_value DECIMAL(15,4),
  target_year INTEGER,
  baseline_value DECIMAL(15,4),
  baseline_year INTEGER,
  progress_percent DECIMAL(5,2),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Metricas ESRS Sociales (S1-S4)
- **S1 - Propia Fuerza Laboral:** Headcount, rotacion, brecha salarial, formacion
- **S2 - Trabajadores Cadena Valor:** Due diligence proveedores
- **S3 - Comunidades Afectadas:** Impacto local
- **S4 - Consumidores/Usuarios:** Privacidad, seguridad producto

---

## FASE 6: Matter Management & Legal Spend (Juridico)
**Duracion estimada: 2-3 semanas**
**Prioridad: ALTA - Paridad con Icertis/LegalTracker**

### Componentes a Crear

```text
src/
  components/
    erp/
      legal/
        matters/
          MattersDashboard.tsx           # Dashboard asuntos
          MatterList.tsx                 # Listado asuntos
          MatterDetail.tsx               # Detalle asunto
          MatterTimeline.tsx             # Timeline del asunto
          MatterDocuments.tsx            # Documentos asociados
          MatterParties.tsx              # Partes involucradas
          MatterTasks.tsx                # Tareas del asunto
          LitigationTracker.tsx          # Seguimiento litigios
        spend/
          LegalSpendDashboard.tsx        # Dashboard gastos legales
          BudgetManager.tsx              # Gestion presupuestos
          InvoiceReview.tsx              # Revision facturas
          LEDESImporter.tsx              # Importador LEDES
          VendorManagement.tsx           # Gestion despachos externos
          RateCardManager.tsx            # Tarificadores
          SpendAnalytics.tsx             # Analiticas gastos
          AccrualManagement.tsx          # Gestion provisiones
```

### Tablas de Base de Datos

```sql
-- Asuntos legales
CREATE TABLE erp_legal_matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  matter_number VARCHAR(50) UNIQUE,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100), -- litigation, contract, regulatory, ip, employment
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20),
  practice_area VARCHAR(100),
  jurisdiction VARCHAR(100),
  description TEXT,
  open_date DATE,
  close_date DATE,
  lead_attorney VARCHAR(255),
  external_counsel JSONB,
  parties JSONB,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  outcome VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos legales
CREATE TABLE erp_legal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES erp_legal_matters(id),
  vendor_id UUID,
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  total_amount DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending',
  ledes_data JSONB, -- Datos LEDES parseados
  line_items JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate cards
CREATE TABLE erp_legal_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  vendor_id UUID,
  effective_date DATE,
  expiry_date DATE,
  rates JSONB, -- Por timekeeper level
  caps JSONB, -- Limites por tipo
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## FASE 7: Partner/Vendor Portal (Cross-Module)
**Duracion estimada: 2-3 semanas**
**Prioridad: MEDIA - Q3 2026 Roadmap**

### Componentes a Crear

```text
src/
  components/
    portals/
      partner/
        PartnerPortalDashboard.tsx       # Dashboard partner
        PartnerRegistration.tsx          # Registro partners
        PartnerOnboarding.tsx            # Onboarding partners
        DealRegistration.tsx             # Registro oportunidades
        PartnerPerformance.tsx           # Performance/KPIs
        CommissionTracker.tsx            # Comisiones
        PartnerResources.tsx             # Centro recursos
        PartnerCertifications.tsx        # Certificaciones
      vendor/
        VendorPortalDashboard.tsx        # Dashboard proveedor
        VendorOnboarding.tsx             # Onboarding proveedores
        RFQResponder.tsx                 # Responder RFQs
        POTracker.tsx                    # Seguimiento pedidos
        InvoiceSubmission.tsx            # Envio facturas
        VendorPerformance.tsx            # Scorecard proveedor
```

---

## FASE 8: Customer Self-Service Portal (CRM)
**Duracion estimada: 2 semanas**
**Prioridad: MEDIA - Q3 2026 Roadmap**

### Componentes a Crear

```text
src/
  components/
    portals/
      customer/
        CustomerPortalDashboard.tsx      # Dashboard cliente
        CustomerLogin.tsx                # Login portal
        TicketCenter.tsx                 # Centro de tickets
        KnowledgeBase.tsx                # Base conocimiento
        CustomerInvoices.tsx             # Mis facturas
        CustomerContracts.tsx            # Mis contratos
        CustomerQuotes.tsx               # Mis presupuestos
        CustomerOrders.tsx               # Mis pedidos
        CustomerPreferences.tsx          # Preferencias
        CustomerChatWidget.tsx           # Chat soporte
```

---

## FASE 9: Industry Cloud Templates
**Duracion estimada: 3-4 semanas**
**Prioridad: MEDIA - Verticalizacion sectorial**

### Templates por Sector

```text
src/
  templates/
    industries/
      banking/
        BankingCRMTemplate.tsx
        BankingComplianceTemplate.tsx
        BankingReportingTemplate.tsx
      insurance/
        InsuranceCRMTemplate.tsx
        ClaimsManagementTemplate.tsx
        PolicyManagementTemplate.tsx
      healthcare/
        HealthcareCRMTemplate.tsx
        PatientManagementTemplate.tsx
        ComplianceHIPAATemplate.tsx
      construction/
        ConstructionCRMTemplate.tsx
        ProjectControlTemplate.tsx
        SubcontractorTemplate.tsx
      professional-services/
        PSACRMTemplate.tsx
        TimeAndBillingTemplate.tsx
        MatterManagementTemplate.tsx
```

---

## FASE 10: Unified Analytics Dashboard (Cross-Module)
**Duracion estimada: 2-3 semanas**
**Prioridad: ALTA - Q2 2026 Roadmap**

### Componentes a Crear

```text
src/
  components/
    analytics/
      unified/
        UnifiedAnalyticsDashboard.tsx    # Dashboard unificado
        CrossModuleKPIs.tsx              # KPIs cross-module
        ExecutiveScorecard.tsx           # Scorecard ejecutivo
        DataExplorer.tsx                 # Explorador datos
        ReportBuilder.tsx                # Constructor reportes
        AlertsConfigPanel.tsx            # Configuracion alertas
        DrillDownViewer.tsx              # Drill-down interactivo
        BenchmarkComparison.tsx          # Comparativa benchmarks
        PredictiveInsights.tsx           # Insights predictivos
        DataExportHub.tsx                # Hub exportacion
```

---

## Cronograma Propuesto

```text
                          2026
                          Q1              Q2              Q3              Q4
                   |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
Fase 1 Marketing   |=====|=====|     |     |     |     |     |     |     |     |     |     |
Fase 2 Workflows   |     |=====|=====|     |     |     |     |     |     |     |     |     |
Fase 3 Gig Work    |     |     |=====|=====|     |     |     |     |     |     |     |     |
Fase 4 Rewards     |     |     |     |=====|     |     |     |     |     |     |     |     |
Fase 5 ESG Suite   |     |     |     |=====|=====|=====|     |     |     |     |     |     |
Fase 6 Legal Spend |     |     |     |     |     |=====|=====|     |     |     |     |     |
Fase 7 Partner     |     |     |     |     |     |     |=====|=====|     |     |     |     |
Fase 8 Customer    |     |     |     |     |     |     |     |=====|=====|     |     |     |
Fase 9 Industry    |     |     |     |     |     |     |     |     |=====|=====|=====|     |
Fase 10 Analytics  |     |     |     |     |     |     |     |     |     |     |=====|=====|
```

---

## Impacto en Valoracion Economica

| Fase | Modulo | Valor Desarrollo | Valor Mercado | Prima IA |
|------|--------|-----------------|---------------|----------|
| 1 | Marketing Automation | €180.000 | €350.000 | €120.000 |
| 2 | Workflow Builder | €120.000 | €250.000 | €80.000 |
| 3 | Gig Workforce | €150.000 | €300.000 | €100.000 |
| 4 | Total Rewards | €60.000 | €120.000 | €40.000 |
| 5 | ESG Suite | €200.000 | €450.000 | €150.000 |
| 6 | Legal Spend | €140.000 | €280.000 | €90.000 |
| 7 | Partner Portal | €100.000 | €200.000 | €60.000 |
| 8 | Customer Portal | €80.000 | €160.000 | €50.000 |
| 9 | Industry Templates | €160.000 | €350.000 | €100.000 |
| 10 | Unified Analytics | €130.000 | €280.000 | €90.000 |
| **TOTAL** | | **€1.320.000** | **€2.740.000** | **€880.000** |

### Nueva Valoracion Total Post-Implementacion

- **Valor Actual:** €5.591.000
- **Valor Mejoras:** €2.740.000
- **Nuevo Valor Total:** €8.331.000
- **Ventaja vs Competencia:** +38%

---

## Dependencias Tecnicas

### Edge Functions Nuevas (15)
1. crm-marketing-automation
2. crm-email-sequencer
3. crm-audience-segmentation
4. crm-workflow-engine
5. crm-workflow-executor
6. erp-hr-gig-management
7. erp-hr-contractor-compliance
8. erp-hr-total-rewards
9. erp-esg-data-collection
10. erp-esg-csrd-generator
11. erp-legal-matter-management
12. erp-legal-spend-analytics
13. portal-partner-gateway
14. portal-customer-gateway
15. analytics-unified-engine

### Nuevas Tablas DB (18)
- crm_marketing_campaigns
- crm_email_sequences
- crm_audience_segments
- crm_email_templates
- crm_workflows
- crm_workflow_executions
- erp_hr_contractors
- erp_hr_gig_projects
- erp_hr_contractor_payments
- erp_esg_metrics
- erp_esg_targets
- erp_legal_matters
- erp_legal_invoices
- erp_legal_rate_cards
- portal_partner_users
- portal_customer_users
- analytics_reports
- analytics_dashboards

---

## Resumen Ejecutivo

Este plan de 10 fases cerrara completamente los gaps identificados en el informe de auditoria, llevando a ObelixIA de **paridad funcional** a **superioridad demostrada** frente a SAP, Salesforce, Workday y Oracle.

Las prioridades criticas son:
1. **Marketing Automation** - Cierra gap mas visible vs. HubSpot
2. **ESG Suite** - Compliance obligatorio CSRD 2025
3. **Gig Workforce** - Tendencia mercado laboral

Post-implementacion, ObelixIA sera la unica plataforma del mercado con:
- CRM + ERP + Legal + ESG integrados nativamente
- Marketing Automation con IA predictiva
- Gestion fuerza laboral hibrida (empleados + contractors)
- Compliance ESG automatizado CSRD/ESRS
- Matter Management + Legal Spend integrado
- Portales self-service Partner/Customer
- Analytics unificado cross-module
