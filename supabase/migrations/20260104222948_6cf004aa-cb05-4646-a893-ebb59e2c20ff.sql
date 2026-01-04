-- Insertar conocimiento base completo para TODOS los agentes CRM
-- Primero limpiar datos existentes incompletos
DELETE FROM agent_knowledge_base WHERE agent_id IN ('leads', 'accounting', 'supervisor', 'contacts', 'opportunities', 'proposals', 'customers', 'activities', 'supervisor_crm', 'inventory', 'hr', 'treasury', 'compliance', 'customer_success', 'pipeline');

-- ==========================================
-- AGENTE: LEADS (CRM)
-- ==========================================
INSERT INTO agent_knowledge_base (agent_id, agent_type, category, title, description, content, section_index, order_index, tags, is_verified, source) VALUES
('leads', 'crm', 'capability', 'Capacidades del Agente de Leads', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Calificación automática**: Evalúa leads entrantes usando IA para asignar puntuación basada en comportamiento y perfil
- **Scoring predictivo**: Predice probabilidad de conversión usando machine learning
- **Enriquecimiento de datos**: Obtiene información adicional del lead desde fuentes externas
- **Routing inteligente**: Asigna leads al vendedor óptimo según especialización y carga
- **Detección de duplicados**: Identifica y fusiona leads duplicados automáticamente
- **Seguimiento de engagement**: Monitorea interacciones email, web y social', 1, 1, ARRAY['leads', 'scoring', 'calificación', 'IA'], true, 'system'),

('leads', 'crm', 'example', 'Ejemplo: Calificar un Lead', 'Cómo se califica un lead automáticamente', '**Escenario**: Un lead llega desde el formulario web

**Proceso automático**:
1. El agente recibe los datos del formulario
2. Analiza tamaño de empresa, industria, cargo
3. Verifica actividad previa (emails abiertos, páginas visitadas)
4. Consulta base de datos de empresas similares convertidas
5. Asigna score de 0-100
6. Si score > 75: marca como "Hot Lead" y notifica a ventas

**Resultado**: Lead calificado en <2 segundos con score de 82/100', 1, 2, ARRAY['ejemplo', 'calificación', 'automatización'], true, 'system'),

('leads', 'crm', 'tip', 'Optimizar Lead Scoring', 'Consejos para mejorar precisión', '## Tips para mejor scoring

1. **Mantener datos actualizados**: Revisa campos vacíos o desactualizados
2. **Definir ICP claro**: El agente aprende de tu Perfil de Cliente Ideal
3. **Feedback constante**: Marca leads convertidos/perdidos para entrenar el modelo
4. **Revisar umbrales**: Ajusta los thresholds según tu ciclo de venta
5. **Integrar más fuentes**: Conecta LinkedIn, website tracking, email', 1, 3, ARRAY['tips', 'scoring', 'optimización'], true, 'system'),

('leads', 'crm', 'faq', '¿Cada cuánto se recalcula el score?', 'Frecuencia de actualización del scoring', 'El score se recalcula:
- **En tiempo real**: cuando hay nueva actividad del lead
- **Diariamente**: para todos los leads activos (decaimiento temporal)
- **Bajo demanda**: cuando solicitas re-evaluación manual

El modelo predictivo se reentrena semanalmente con los nuevos datos de conversión.', 1, 4, ARRAY['faq', 'scoring', 'frecuencia'], true, 'system'),

('leads', 'crm', 'best_practice', 'Gestión eficiente de leads fríos', 'Estrategias para leads de bajo score', '## Mejores prácticas para leads fríos (score < 40)

1. **No descartar inmediatamente**: Pueden madurar con nurturing
2. **Segmentar por motivo**: ¿Timing? ¿Budget? ¿Fit?
3. **Nurturing automatizado**: Configurar campañas de largo plazo
4. **Re-engagement triggers**: Alertar cuando retomen actividad
5. **Limpieza periódica**: Después de 6 meses sin actividad, archivar', 1, 5, ARRAY['best_practice', 'leads_frios', 'nurturing'], true, 'system'),

-- ==========================================
-- AGENTE: CONTACTS (CRM)
-- ==========================================
('contacts', 'crm', 'capability', 'Capacidades del Agente de Contactos', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Gestión 360° del contacto**: Visión completa con todas las interacciones
- **Detección de stakeholders**: Identifica roles y jerarquías en la organización
- **Análisis de sentiment**: Evalúa tono de comunicaciones para detectar riesgos
- **Sugerencias de contacto**: Recomienda frecuencia óptima de follow-up
- **Multi-canal tracking**: Consolida interacciones de email, llamadas, reuniones
- **Actualización automática**: Sincroniza datos desde LinkedIn y email signatures', 2, 1, ARRAY['contactos', 'gestión', 'stakeholders'], true, 'system'),

('contacts', 'crm', 'example', 'Ejemplo: Mapeo de Cuenta', 'Cómo identificar stakeholders clave', '**Escenario**: Nueva cuenta enterprise con múltiples contactos

**Proceso**:
1. Importar contactos de la empresa desde LinkedIn Sales Navigator
2. El agente analiza títulos y departamentos
3. Identifica: Decision Maker, Influencer, Champion, Blocker
4. Crea organigrama visual de la cuenta
5. Sugiere estrategia de approach por rol

**Resultado**: Mapa de 12 contactos con roles y prioridad de contacto', 2, 2, ARRAY['ejemplo', 'account_mapping', 'stakeholders'], true, 'system'),

('contacts', 'crm', 'tip', 'Mantener contactos actualizados', 'Estrategias de higiene de datos', '## Tips para datos de contacto limpios

1. **Validar emails**: Usa verificación automática para detectar bounces
2. **Detectar cambios de empresa**: Alertas cuando contactos cambian de trabajo
3. **Consolidar duplicados**: Revisa sugerencias de merge semanalmente
4. **Completar campos clave**: Prioriza cargo, teléfono, LinkedIn
5. **Notas contextuales**: Registra preferencias y particularidades', 2, 3, ARRAY['tips', 'datos', 'higiene'], true, 'system'),

('contacts', 'crm', 'faq', '¿Cómo se detectan duplicados?', 'Algoritmo de detección de duplicados', 'El agente usa múltiples criterios para detectar duplicados:

- **Email exacto**: Match 100%
- **Nombre + Empresa**: Fuzzy matching con tolerancia a typos
- **Teléfono**: Normalizado sin formato
- **LinkedIn URL**: Si está disponible

Cuando encuentra posibles duplicados, te muestra comparación lado a lado para confirmar merge.', 2, 4, ARRAY['faq', 'duplicados', 'merge'], true, 'system'),

-- ==========================================
-- AGENTE: OPPORTUNITIES (CRM)
-- ==========================================
('opportunities', 'crm', 'capability', 'Capacidades del Agente de Oportunidades', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Predicción de cierre**: Estima probabilidad de ganar y fecha probable
- **Análisis de pipeline**: Identifica cuellos de botella y deals en riesgo
- **Coaching en tiempo real**: Sugiere próximos pasos basados en best practices
- **Detección de deals estancados**: Alerta cuando no hay movimiento
- **Forecast inteligente**: Proyección de revenue con intervalos de confianza
- **Competitive intelligence**: Detecta competidores mencionados y sugiere battlecards', 3, 1, ARRAY['oportunidades', 'pipeline', 'forecast'], true, 'system'),

('opportunities', 'crm', 'example', 'Ejemplo: Deal en Riesgo', 'Cómo el agente detecta y actúa en deals problemáticos', '**Escenario**: Oportunidad de $50K sin actividad en 15 días

**Detección automática**:
1. El agente detecta ausencia de emails/reuniones recientes
2. Analiza última interacción: "Esperando aprobación de presupuesto"
3. Compara con deals similares: 80% de deals en esta etapa cierran en 10 días
4. Genera alerta de riesgo con score 7/10

**Acción sugerida**:
- Enviar email de seguimiento con caso de estudio relevante
- Ofrecer llamada con sponsor ejecutivo
- Proponer extensión de trial/POC', 3, 2, ARRAY['ejemplo', 'riesgo', 'deal_coaching'], true, 'system'),

('opportunities', 'crm', 'tip', 'Mejorar precisión del forecast', 'Consejos para proyecciones más exactas', '## Tips para mejor forecast

1. **Actualizar stage con frecuencia**: Evita deals "pegados"
2. **Registrar close date realista**: No uses fechas de fin de mes/quarter por defecto
3. **Documentar competencia**: Ayuda al modelo a predecir win rate
4. **Marcar deal qualifiers**: BANT, MEDDIC o tu metodología
5. **Cerrar deals perdidos**: No dejar oportunidades en limbo', 3, 3, ARRAY['tips', 'forecast', 'pipeline'], true, 'system'),

('opportunities', 'crm', 'best_practice', 'Gestión de pipeline saludable', 'Mejores prácticas para pipeline management', '## Mejores prácticas

1. **Coverage ratio 3:1**: Pipeline debe ser 3x tu objetivo
2. **Velocidad por etapa**: Define SLAs máximos por stage
3. **Weekly pipeline review**: Con el agente identificando anomalías
4. **Commit vs Best Case**: Separa deals seguros de probables
5. **Win/Loss analysis**: Documenta motivos para entrenar el modelo', 3, 4, ARRAY['best_practice', 'pipeline', 'gestión'], true, 'system'),

-- ==========================================
-- AGENTE: PROPOSALS (CRM)
-- ==========================================
('proposals', 'crm', 'capability', 'Capacidades del Agente de Propuestas', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Generación automática**: Crea propuestas desde templates con datos del deal
- **Pricing optimization**: Sugiere descuentos óptimos según histórico
- **Análisis de competitividad**: Compara tu propuesta vs mercado
- **Tracking de visualización**: Sabe cuándo y qué leyó el cliente
- **Versiones y comparativas**: Gestiona múltiples versiones y negociaciones
- **Approval workflow**: Automatiza aprobaciones según monto/descuento', 4, 1, ARRAY['propuestas', 'pricing', 'documentos'], true, 'system'),

('proposals', 'crm', 'example', 'Ejemplo: Propuesta Optimizada', 'Generación inteligente de propuesta', '**Escenario**: Crear propuesta para deal de $100K

**Proceso automático**:
1. Obtener datos del deal: productos, cantidades, cliente
2. Analizar deals similares ganados: descuento promedio 12%
3. Detectar urgencia: close date en 5 días
4. Aplicar pricing dinámico: -15% si firma esta semana
5. Seleccionar template según industria del cliente
6. Generar propuesta con términos personalizados

**Resultado**: Propuesta generada en 30 segundos con 87% probabilidad de aceptación', 4, 2, ARRAY['ejemplo', 'propuesta', 'pricing'], true, 'system'),

('proposals', 'crm', 'tip', 'Propuestas que convierten', 'Consejos para propuestas efectivas', '## Tips para mejores propuestas

1. **Personalización**: Incluye nombre y logo del cliente
2. **ROI claro**: Cuantifica el valor en términos del cliente
3. **Urgencia**: Ofertas con fecha límite convierten más
4. **Simplicidad**: Menos opciones = decisión más rápida
5. **Social proof**: Incluye logos de clientes similares', 4, 3, ARRAY['tips', 'propuestas', 'conversión'], true, 'system'),

-- ==========================================
-- AGENTE: CUSTOMERS (CRM)
-- ==========================================
('customers', 'crm', 'capability', 'Capacidades del Agente de Clientes', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Health Score**: Puntuación de salud del cliente en tiempo real
- **Churn prediction**: Predice riesgo de baja con 30-60-90 días de anticipación
- **Upsell detection**: Identifica oportunidades de expansión
- **Usage analytics**: Monitorea adopción del producto/servicio
- **NPS tracking**: Seguimiento de satisfacción y promotores
- **Renewal management**: Gestión proactiva de renovaciones', 5, 1, ARRAY['clientes', 'retención', 'expansión'], true, 'system'),

('customers', 'crm', 'example', 'Ejemplo: Cliente en Riesgo', 'Detección proactiva de churn', '**Escenario**: Cliente enterprise con contrato de $200K/año

**Señales detectadas**:
1. Login de usuarios cayó 40% último mes
2. No respondieron encuesta NPS (antes siempre respondían)
3. Contacto principal actualizó LinkedIn (buscando trabajo)
4. Tickets de soporte aumentaron 3x

**Health Score**: Bajó de 85 a 52 (Riesgo Alto)

**Acción automática**:
- Escalado a Customer Success Manager
- Programar QBR de emergencia
- Preparar análisis de valor entregado', 5, 2, ARRAY['ejemplo', 'churn', 'retención'], true, 'system'),

('customers', 'crm', 'best_practice', 'Maximizar Customer Lifetime Value', 'Estrategias de expansión', '## Mejores prácticas para CLV

1. **Onboarding estructurado**: Los primeros 90 días son críticos
2. **Success milestones**: Define y celebra logros del cliente
3. **Regular check-ins**: QBRs trimestrales para clientes enterprise
4. **Proactive outreach**: No esperes a que te contacten
5. **Expansion playbook**: Triggers y scripts para upsell', 5, 3, ARRAY['best_practice', 'clv', 'expansión'], true, 'system'),

-- ==========================================
-- AGENTE: ACTIVITIES (CRM)
-- ==========================================
('activities', 'crm', 'capability', 'Capacidades del Agente de Actividades', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Auto-logging**: Captura automática de emails, llamadas, reuniones
- **Activity scoring**: Valora impacto de cada actividad en el deal
- **Time tracking**: Análisis de tiempo invertido por oportunidad
- **Meeting intelligence**: Transcripción y resumen de reuniones
- **Task automation**: Crea follow-ups automáticos post-reunión
- **Activity patterns**: Identifica patrones de vendedores exitosos', 6, 1, ARRAY['actividades', 'productividad', 'tracking'], true, 'system'),

('activities', 'crm', 'example', 'Ejemplo: Reunión Inteligente', 'Cómo el agente procesa una reunión', '**Escenario**: Llamada de discovery de 45 minutos

**Durante la llamada**:
1. Transcripción en tiempo real
2. Detección de participantes y roles
3. Extracción de pain points mencionados

**Post-llamada automático**:
- Resumen ejecutivo de 3 párrafos
- Action items identificados con owners
- Próximos pasos sugeridos
- Actualización automática del deal stage
- Tareas de follow-up creadas', 6, 2, ARRAY['ejemplo', 'reuniones', 'inteligencia'], true, 'system'),

-- ==========================================
-- SUPERVISOR CRM
-- ==========================================
('supervisor_crm', 'supervisor', 'capability', 'Capacidades del Supervisor CRM', 'Orquestación del equipo de agentes', '## Qué puede hacer el Supervisor

- **Orquestación**: Coordina todos los agentes CRM para flujos complejos
- **Escalaciones**: Recibe y distribuye casos que requieren múltiples agentes
- **Performance monitoring**: Métricas de cada agente del equipo
- **Conflict resolution**: Resuelve cuando agentes tienen recomendaciones conflictivas
- **Strategic insights**: Vista panorámica del pipeline y clientes
- **Learning coordination**: Comparte aprendizajes entre agentes', 1, 1, ARRAY['supervisor', 'orquestación', 'crm'], true, 'system'),

('supervisor_crm', 'supervisor', 'example', 'Ejemplo: Flujo de Nuevo Cliente', 'Orquestación de múltiples agentes', '**Escenario**: Lead se convierte en cliente

**Orquestación del Supervisor**:
1. **Agente Leads**: Marca lead como convertido, actualiza métricas
2. **Agente Oportunidades**: Cierra deal como ganado
3. **Agente Contactos**: Actualiza contactos a tipo "Cliente"
4. **Agente Clientes**: Crea perfil de cliente con health score inicial
5. **Agente Actividades**: Programa onboarding kickoff

**Resultado**: Transición seamless con datos sincronizados', 1, 2, ARRAY['ejemplo', 'orquestación', 'workflow'], true, 'system'),

-- ==========================================
-- AGENTE: INVENTORY (ERP)
-- ==========================================
('inventory', 'erp', 'capability', 'Capacidades del Agente de Inventario', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Predicción de demanda**: Forecast de necesidades con machine learning
- **Optimización de stock**: Niveles óptimos para minimizar costos
- **Alertas automáticas**: Notifica stock bajo, exceso, vencimientos
- **Análisis ABC**: Clasificación de productos por rotación y valor
- **Integración proveedores**: Órdenes automáticas cuando se alcanza reorder point
- **Tracking de movimientos**: Historial completo de entradas/salidas', 1, 1, ARRAY['inventario', 'stock', 'predicción'], true, 'system'),

('inventory', 'erp', 'example', 'Ejemplo: Reabastecimiento Inteligente', 'Orden de compra automática', '**Escenario**: Producto estrella acercándose a stock mínimo

**Proceso automático**:
1. Detecta stock actual: 150 unidades
2. Analiza ventas últimos 30 días: 200 unidades
3. Predice demanda próximos 30 días: 250 unidades (promoción)
4. Calcula lead time proveedor: 10 días
5. Genera orden de compra: 400 unidades
6. Envía para aprobación del manager

**Resultado**: Evitado quiebre de stock con orden preventiva', 1, 2, ARRAY['ejemplo', 'reabastecimiento', 'automatización'], true, 'system'),

-- ==========================================
-- AGENTE: HR (ERP)
-- ==========================================
('hr', 'erp', 'capability', 'Capacidades del Agente de RRHH', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Gestión de nómina**: Cálculos automáticos con deducciones e impuestos
- **Ausencias y vacaciones**: Tracking y aprobación automática
- **Performance reviews**: Recordatorios y consolidación de feedback
- **Onboarding automation**: Flujo completo para nuevos empleados
- **Compliance laboral**: Alertas de vencimientos y requisitos legales
- **Analytics de personal**: Métricas de rotación, satisfacción, productividad', 2, 1, ARRAY['rrhh', 'nómina', 'personal'], true, 'system'),

('hr', 'erp', 'example', 'Ejemplo: Onboarding Automatizado', 'Flujo para nuevo empleado', '**Escenario**: Nuevo desarrollador senior comienza el lunes

**Proceso automático (5 días antes)**:
1. Crear cuentas: email, Slack, GitHub, sistemas internos
2. Asignar equipo: laptop, monitor, periféricos
3. Preparar documentación: contrato, NDA, políticas
4. Notificar a: IT, Facilities, Manager directo
5. Programar: reuniones de bienvenida, training

**Día 1 automático**:
- Welcome email con links y accesos
- Buddy asignado notificado
- Calendario poblado con onboarding tasks', 2, 2, ARRAY['ejemplo', 'onboarding', 'automatización'], true, 'system'),

-- ==========================================
-- AGENTE: ACCOUNTING (ERP)
-- ==========================================
('accounting', 'erp', 'capability', 'Capacidades del Agente de Contabilidad', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Conciliación automática**: Matchea transacciones bancarias con registros
- **Cierre contable**: Guía y automatiza proceso de cierre mensual
- **Reportes financieros**: Genera estados financieros automáticamente
- **Detección de anomalías**: Identifica transacciones inusuales
- **Cumplimiento fiscal**: Alertas de fechas y requisitos tributarios
- **Multi-moneda**: Conversiones y ajustes automáticos', 3, 1, ARRAY['contabilidad', 'finanzas', 'reportes'], true, 'system'),

('accounting', 'erp', 'example', 'Ejemplo: Cierre Mensual', 'Automatización del cierre contable', '**Proceso de cierre automatizado**:

1. **Pre-cierre** (día -3):
   - Verificar transacciones pendientes
   - Alertar sobre facturas sin registrar
   - Revisar conciliación bancaria

2. **Cierre** (día 1):
   - Calcular depreciaciones
   - Ajustes por tipo de cambio
   - Provisiones automáticas

3. **Post-cierre**:
   - Generar estados financieros
   - Comparativo vs mes anterior
   - Enviar reporte a management', 3, 2, ARRAY['ejemplo', 'cierre', 'contabilidad'], true, 'system'),

-- ==========================================
-- AGENTE: TREASURY (ERP)
-- ==========================================
('treasury', 'erp', 'capability', 'Capacidades del Agente de Tesorería', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Cash flow forecast**: Proyección de flujo de caja 30/60/90 días
- **Gestión de pagos**: Programación y ejecución de pagos
- **Cobranza inteligente**: Priorización y automatización de cobros
- **Posición de liquidez**: Vista en tiempo real de disponible
- **Optimización de cuentas**: Sugerencias de movimientos entre cuentas
- **Alertas de tesorería**: Saldos mínimos, vencimientos, oportunidades', 4, 1, ARRAY['tesorería', 'cash_flow', 'pagos'], true, 'system'),

('treasury', 'erp', 'example', 'Ejemplo: Forecast de Cash Flow', 'Proyección inteligente', '**Escenario**: Proyección a 90 días

**Análisis automático**:
1. **Ingresos proyectados**:
   - Cobros de facturas: $500K (probabilidad ponderada)
   - Renovaciones: $200K
   - Nuevas ventas: $150K (del pipeline)

2. **Egresos programados**:
   - Nómina: $300K fijo
   - Proveedores: $180K
   - Impuestos: $50K (15 del mes)

3. **Resultado**: Superávit proyectado de $320K

**Alerta**: Semana 6 tiene gap de $50K - sugerencia de acelerar cobranza', 4, 2, ARRAY['ejemplo', 'forecast', 'cash_flow'], true, 'system'),

-- ==========================================
-- AGENTE: COMPLIANCE (ERP)
-- ==========================================
('compliance', 'erp', 'capability', 'Capacidades del Agente de Compliance', 'Funcionalidades principales', '## Qué puede hacer este agente

- **Monitoreo regulatorio**: Tracking de cambios en normativas
- **Gestión de riesgos**: Identificación y mitigación de riesgos
- **Auditoría interna**: Checklists y seguimiento automático
- **Documentación legal**: Gestión de contratos y vencimientos
- **GDPR/Privacy**: Cumplimiento de protección de datos
- **Reportes de compliance**: Dashboards para dirección y reguladores', 5, 1, ARRAY['compliance', 'regulación', 'riesgos'], true, 'system'),

('compliance', 'erp', 'example', 'Ejemplo: Auditoría Automatizada', 'Proceso de auditoría con IA', '**Escenario**: Auditoría trimestral de controles

**Proceso automático**:
1. Ejecutar checklist de 150 controles
2. Recopilar evidencia automáticamente desde sistemas
3. Detectar gaps o excepciones
4. Generar reporte con hallazgos
5. Asignar remediaciones con due dates
6. Notificar a responsables

**Resultado**: Auditoría completada en 2 días vs 2 semanas manual', 5, 2, ARRAY['ejemplo', 'auditoría', 'controles'], true, 'system'),

-- ==========================================
-- SUPERVISOR GENERAL (ERP)
-- ==========================================
('supervisor', 'supervisor', 'capability', 'Capacidades del Supervisor General', 'Orquestación de todos los agentes', '## Qué puede hacer el Supervisor General

- **Vista 360°**: Dashboard unificado de todos los módulos
- **Cross-module orchestration**: Coordina agentes CRM y ERP
- **Alertas consolidadas**: Prioriza alertas de todos los sistemas
- **Strategic analytics**: KPIs y métricas ejecutivas
- **Anomaly detection**: Detecta patrones inusuales entre módulos
- **Intelligent routing**: Dirige consultas al agente correcto', 1, 1, ARRAY['supervisor', 'orquestación', 'enterprise'], true, 'system'),

('supervisor', 'supervisor', 'example', 'Ejemplo: Análisis de Impacto', 'Coordinación cross-module', '**Escenario**: Cliente importante solicita descuento especial

**Análisis del Supervisor**:
1. **Agente Clientes**: Health score 92, cliente desde 2019
2. **Agente Oportunidades**: $500K en pipeline con este cliente
3. **Agente Tesorería**: Buen pagador, siempre a tiempo
4. **Agente Contabilidad**: Margen actual 35%

**Recomendación consolidada**:
- Aprobar descuento hasta 10% mantiene rentabilidad
- Alto valor estratégico justifica flexibilidad
- Sugerir contrato multi-anual a cambio', 1, 2, ARRAY['ejemplo', 'análisis', 'cross_module'], true, 'system'),

('supervisor', 'supervisor', 'best_practice', 'Uso efectivo del Supervisor', 'Mejores prácticas', '## Mejores prácticas

1. **Consultas complejas primero aquí**: El supervisor sabe a quién derivar
2. **Vista ejecutiva**: Usa el dashboard consolidado para reuniones de dirección
3. **Alertas prioritarias**: Configura umbrales para escalaciones automáticas
4. **Cross-training**: Deja que el supervisor aprenda de las interacciones
5. **Feedback loop**: Indica cuando la derivación no fue correcta', 1, 3, ARRAY['best_practice', 'supervisor', 'uso'], true, 'system');