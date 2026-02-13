// ============= Full file contents =============

1: /**
2:  * GALIA Dashboard - Main Component (Refactored v2.0)
3:  * Gestión de Ayudas LEADER con Inteligencia Artificial
4:  * Navegación moderna con categorías agrupadas
5:  */
6: 
7: import { useState, lazy, Suspense, useCallback, useEffect } from 'react';
8: import { Button } from '@/components/ui/button';
9: import { Skeleton } from '@/components/ui/skeleton';
10: import { toast } from 'sonner';
11: import { Plus, RefreshCw, Bot } from 'lucide-react';
12: import { useGaliaAnalytics } from '@/hooks/galia/useGaliaAnalytics';
13: import { useGaliaExpedientesExtended, GaliaExpedienteExtended } from '@/hooks/galia/useGaliaExpedientesExtended';
14: import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
15: import { GaliaKPICards } from './shared/GaliaKPICards';
16: import { 
17:   GaliaResumenTab,
18:   GaliaExpedientesTab,
19:   GaliaConvocatoriasTab,
20:   GaliaAlertasTab,
21:   GaliaSidebarPanel,
22:   GaliaAlertsList, 
23:   GaliaTecnicosPanel 
24: } from './dashboard';
25: import { GaliaCircuitoTramitacion } from './dashboard/GaliaCircuitoTramitacion';
26: import { GaliaTecnicoToolkit } from './dashboard/GaliaTecnicoToolkit';
27: import { GaliaNavigation } from './dashboard/GaliaNavigation';
28: import { cn } from '@/lib/utils';
29: import { GaliaNuevaConvocatoriaModal } from './GaliaNuevaConvocatoriaModal';
30: 
31: // Import lazy components from centralized file to reduce bundle size
32: import {
33:   GaliaPortalCiudadano,
34:   GaliaModeradorCostes,
35:   GaliaReportGenerator,
36:   GaliaDocumentAnalyzer,
37:   GaliaTransparencyPortal,
38:   GaliaDocumentGeneratorPanel,
39:   GaliaGeoIntelligencePanel,
40:   GaliaConvocatoriaSimulatorPanel,
41:   GaliaBeneficiario360Panel,
42:   GaliaBPMNWorkflowsPanel,
43:   GaliaAdminIntegrationsPanel,
44:   GaliaKnowledgeExplorer,
45:   GaliaExportToolbar,
46:   GaliaComplianceAuditor,
47:   GaliaProjectStatusDashboard,
48:   GaliaHybridAIPanel,
49:   GaliaNationalFederationDashboard,
50:   GaliaTerritorialMapPanel,
51: } from './dashboard/tabs/GaliaMainTabs';
52: 
53: const GaliaAsistenteVirtual = lazy(() => import('./GaliaAsistenteVirtual'));
54: 
55: const TabSkeleton = () => (
56:   <div className="space-y-4">
57:     <Skeleton className="h-32 w-full" />
58:     <Skeleton className="h-48 w-full" />
59:   </div>
60: );
61: 
62: export function GaliaDashboard() {
63:   const [activeTab, setActiveTab] = useState('resumen');
64:   const [searchTerm, setSearchTerm] = useState('');
65:   const [showAssistant, setShowAssistant] = useState(false);
66:   const [selectedExpediente, setSelectedExpediente] = useState<GaliaExpedienteExtended | null>(null);
67:   const [workflowEstadoFilter, setWorkflowEstadoFilter] = useState<string | undefined>(undefined);
68:   const [showNuevaConvocatoriaModal, setShowNuevaConvocatoriaModal] = useState(false);
69: 
70:   const { kpis, analyticsData, isLoading: loadingAnalytics, refresh } = useGaliaAnalytics();
71:   const { 
72:     expedientes, 
73:     updateExpedienteEstado,
74:     getExpedientesConRiesgo 
75:   } = useGaliaExpedientesExtended({ estado: workflowEstadoFilter as any });
76:   const { 
77:     convocatorias, 
78:     getPresupuestoStats,
79:     createConvocatoria 
80:   } = useGaliaConvocatorias();
81: 
82:   const presupuestoStats = getPresupuestoStats();
83:   const expedientesRiesgo = getExpedientesConRiesgo(70);
84: 
85:   // Listen for tab change events from sidebar
86:   useEffect(() => {
87:     const handleTabChange = (event: CustomEvent<string>) => {
88:       setActiveTab(event.detail);
89:     };
90:     window.addEventListener('galia-tab-change', handleTabChange as EventListener);
91:     return () => window.removeEventListener('galia-tab-change', handleTabChange as EventListener);
92:   }, []);
93: 
94:   const handleCambiarEstado = useCallback(async (nuevoEstado: string) => {
95:     if (selectedExpediente) {
96:       await updateExpedienteEstado(selectedExpediente.id, nuevoEstado);
97:       // Refetch handled inside hook
98:     }
99:   }, [selectedExpediente, updateExpedienteEstado]);
100: 
101:   const formatCurrency = useCallback((value: number) => {
102:     return new Intl.NumberFormat('es-ES', {
103:       style: 'currency',
104:       currency: 'EUR',
105:       minimumFractionDigits: 0,
106:       maximumFractionDigits: 0,
107:     }).format(value);
108:   }, []);
109: 
110:   // Render tab content based on activeTab
111:   const renderTabContent = () => {
112:     switch (activeTab) {
113:       case 'resumen':
114:         return (
115:           <GaliaResumenTab
116:             presupuestoStats={presupuestoStats}
117:             analyticsData={analyticsData}
118:             kpis={kpis}
119:             formatCurrency={formatCurrency}
120:           />
121:         );
122:       
123:       case 'gestion':
124:         return (
125:           <>
126:             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
127:               <GaliaCircuitoTramitacion 
128:                 estadoActual={selectedExpediente?.estado || 'incorporacion_solicitud'}
129:                 historial={selectedExpediente?.historial_transiciones || []}
130:                 onTransicion={handleCambiarEstado}
131:                 readOnly={!selectedExpediente}
132:               />
133:               <GaliaTecnicosPanel 
134:                 expedienteSeleccionado={selectedExpediente?.numero_expediente}
135:                 onAsignarExpediente={(tecnicoId) => {
136:                   console.log('Asignar expediente a técnico:', tecnicoId);
137:                   toast.info(`Expediente asignado al técnico ${tecnicoId}`);
138:                 }}
139:               />
140:             </div>
141:             <div className="mt-4">
142:               <GaliaAlertsList 
143:                 onSelectExpediente={(expId) => {
144:                   const exp = expedientes.find(e => e.numero_expediente === expId);
145:                   if (exp) {
146:                     setSelectedExpediente(exp);
147:                     toast.info(`Expediente ${expId} seleccionado`);
148:                   }
149:                 }}
150:               />
151:             </div>
152:           </>
153:         );
154:       
155:       case 'toolkit-panel':
156:         return <GaliaTecnicoToolkit onNavigate={setActiveTab} />;
157:       
158:       case 'alertas':
159:         return <GaliaAlertasTab expedientesRiesgo={expedientesRiesgo} />;
160:       
161:       case 'expedientes':
162:         return (
163:           <GaliaExpedientesTab
164:             expedientes={expedientes as any}
165:             searchTerm={searchTerm}
166:             onSearchChange={setSearchTerm}
167:             selectedExpediente={selectedExpediente as any}
168:             onSelectExpediente={(exp) => setSelectedExpediente(exp as GaliaExpedienteExtended)}
169:             onCambiarEstado={handleCambiarEstado as any}
170:             workflowEstadoFilter={workflowEstadoFilter}
171:             formatCurrency={formatCurrency}
172:           />
173:         );
174:       
175:       case 'convocatorias':
176:         return <GaliaConvocatoriasTab convocatorias={convocatorias} formatCurrency={formatCurrency} />;
177:       
178:       case 'beneficiario360':
179:         return <Suspense fallback={<TabSkeleton />}><GaliaBeneficiario360Panel /></Suspense>;
180:       
181:       case 'costes':
182:         return <Suspense fallback={<TabSkeleton />}><GaliaModeradorCostes /></Suspense>;
183:       
184:       case 'documentos':
185:         return <Suspense fallback={<TabSkeleton />}><GaliaDocumentAnalyzer /></Suspense>;
186:       
187:       case 'docgen':
188:         return <Suspense fallback={<TabSkeleton />}><GaliaDocumentGeneratorPanel /></Suspense>;
189:       
190:       case 'hybrid-ai':
191:         return <Suspense fallback={<TabSkeleton />}><GaliaHybridAIPanel /></Suspense>;
192:       
193:       case 'knowledge':
194:         return <Suspense fallback={<TabSkeleton />}><GaliaKnowledgeExplorer /></Suspense>;
195:       
196:       case 'simulator':
197:         return <Suspense fallback={<TabSkeleton />}><GaliaConvocatoriaSimulatorPanel /></Suspense>;
198:       
199:       case 'geo':
200:         return <Suspense fallback={<TabSkeleton />}><GaliaGeoIntelligencePanel /></Suspense>;
201:       
202:       case 'informes':
203:         return <Suspense fallback={<TabSkeleton />}><GaliaReportGenerator /></Suspense>;
204:       
205:       case 'export':
206:         return <Suspense fallback={<TabSkeleton />}><GaliaExportToolbar expedienteId={selectedExpediente?.id} /></Suspense>;
207:       
208:       case 'bpmn':
209:         return <Suspense fallback={<TabSkeleton />}><GaliaBPMNWorkflowsPanel /></Suspense>;
210:       
211:       case 'integraciones':
212:         return <Suspense fallback={<TabSkeleton />}><GaliaAdminIntegrationsPanel /></Suspense>;
213:       
214:       case 'portal':
215:         return <Suspense fallback={<TabSkeleton />}><GaliaPortalCiudadano /></Suspense>;
216:       
217:       case 'transparencia':
218:         return <Suspense fallback={<TabSkeleton />}><GaliaTransparencyPortal /></Suspense>;
219:       
220:       case 'compliance':
221:         return <Suspense fallback={<TabSkeleton />}><GaliaComplianceAuditor /></Suspense>;
222:       
223:       case 'project-status':
224:         return <Suspense fallback={<TabSkeleton />}><GaliaProjectStatusDashboard /></Suspense>;
225:       
226:       case 'federation':
227:         return <Suspense fallback={<TabSkeleton />}><GaliaNationalFederationDashboard /></Suspense>;
228:       
229:       case 'territorial-map':
230:         return <Suspense fallback={<TabSkeleton />}><GaliaTerritorialMapPanel /></Suspense>;
231:       
232:       default:
233:         return (
234:           <div className="text-center py-12 text-muted-foreground">
235:             <p>Selecciona una opción del menú</p>
236:           </div>
237:         );
238:     }
239:   };
240: 
241:   return (
242:     <div className="space-y-6">
243:       {/* Header */}
244:       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
245:         <div>
246:           <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
247:             GALIA - Gestión de Ayudas LEADER
248:           </h1>
249:           <p className="text-muted-foreground">
250:             Sistema inteligente de gestión de subvenciones públicas
251:           </p>
252:         </div>
253:         <div className="flex items-center gap-2">
254:           <Button variant="outline" size="sm" onClick={() => refresh()}>
255:             <RefreshCw className={cn("h-4 w-4 mr-2", loadingAnalytics && "animate-spin")} />
256:             Actualizar
257:           </Button>
258:           <Button 
259:             variant={showAssistant ? "default" : "outline"} 
260:             size="sm"
261:             onClick={() => setShowAssistant(!showAssistant)}
262:           >
263:             <Bot className="h-4 w-4 mr-2" />
264:             Asistente IA
265:           </Button>
266:           <Button size="sm" onClick={() => setShowNuevaConvocatoriaModal(true)}>
267:             <Plus className="h-4 w-4 mr-2" />
268:             Nueva Convocatoria
269:           </Button>
270:         </div>
271:       </div>
272: 
273:       {/* KPIs */}
274:       <GaliaKPICards kpis={kpis} isLoading={loadingAnalytics} />
275: 
276:       {/* Navigation */}
277:       <GaliaNavigation activeTab={activeTab} onTabChange={setActiveTab} />
278: 
279:       {/* Main Content */}
280:       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
281:         {/* Left Column - Main Content */}
282:         <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-1")}>
283:           <div className="bg-card rounded-xl border border-border/50 p-4 min-h-[400px]">
284:             {renderTabContent()}
285:           </div>
286:         </div>
287: 
288:         {/* Right Column - Assistant or Sidebar */}
289:         {showAssistant ? (
290:           <div className="lg:col-span-1">
291:             <Suspense fallback={<TabSkeleton />}>
292:               <GaliaAsistenteVirtual modo="tecnico" />
293:             </Suspense>
294:           </div>
295:         ) : (
296:           <GaliaSidebarPanel expedientes={expedientes as any} />
297:         )}
298:       </div>
299: 
300:       {/* Modal Nueva Convocatoria */}
301:       <GaliaNuevaConvocatoriaModal
302:         isOpen={showNuevaConvocatoriaModal}
303:         onClose={() => setShowNuevaConvocatoriaModal(false)}
304:         onCreate={createConvocatoria}
305:       />
306:     </div>
307:   );
308: }
309: 
310: export default GaliaDashboard;