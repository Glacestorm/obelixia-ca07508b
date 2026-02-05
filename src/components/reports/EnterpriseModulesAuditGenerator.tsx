 /**
  * Enterprise Modules Audit Generator
  * UI Component for generating comprehensive audit PDFs for HR, Fiscal, and Legal modules
  */
 
 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { 
   FileText, 
   Download, 
   Loader2, 
   Users, 
   Calculator, 
   Scale, 
   CheckCircle,
   TrendingUp,
   Shield,
   Sparkles,
   Building2,
   Globe
 } from 'lucide-react';
 import { toast } from 'sonner';
 import { 
   generateEnterpriseModulesAuditPDF, 
   type AuditConfig, 
   type AuditReportType, 
   type DetailLevel 
 } from '@/lib/enterpriseModulesAuditPDF';
 
 interface ModuleStats {
   name: string;
   icon: React.ReactNode;
   features: number;
   edgeFunctions: number;
   status: 'complete' | 'advanced' | 'innovation';
   highlights: string[];
 }
 
 const MODULE_STATS: ModuleStats[] = [
   {
     name: 'Recursos Humanos',
     icon: <Users className="h-5 w-5" />,
     features: 45,
     edgeFunctions: 19,
     status: 'advanced',
     highlights: [
       'Skills Ontology con gaps',
       'Talent Marketplace interno',
       'Wellbeing + Burnout prediction',
       'Credenciales Blockchain',
       'Copiloto Autonomo 3 niveles',
     ],
   },
   {
     name: 'Fiscal',
     icon: <Calculator className="h-5 w-5" />,
     features: 28,
     edgeFunctions: 14,
     status: 'complete',
     highlights: [
       'SII Espana completo',
       'Intrastat UE',
       '20+ jurisdicciones',
       'Agente IA con voz',
       'Ayuda activa contextual',
     ],
   },
   {
     name: 'Juridico',
     icon: <Scale className="h-5 w-5" />,
     features: 35,
     edgeFunctions: 10,
     status: 'innovation',
     highlights: [
       'CLM Avanzado + Playbooks',
       'Entity Management',
       'Predictive Litigation',
       'Smart Contracts',
       'Cross-Module Orchestrator',
     ],
   },
 ];
 
 export function EnterpriseModulesAuditGenerator() {
   const [isGenerating, setIsGenerating] = useState(false);
   const [progress, setProgress] = useState(0);
   const [selectedModules, setSelectedModules] = useState<AuditReportType>('all');
   const [detailLevel, setDetailLevel] = useState<DetailLevel>('detailed');
   const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState(true);
   const [includeRoadmap, setIncludeRoadmap] = useState(true);
 
   const handleGenerate = async () => {
     setIsGenerating(true);
     setProgress(0);
 
     try {
       // Simulate progress
       const progressInterval = setInterval(() => {
         setProgress(prev => Math.min(prev + 10, 90));
       }, 200);
 
       const config: AuditConfig = {
         modules: selectedModules,
         detailLevel,
         includeCharts: true,
         includeCompetitorAnalysis,
         includeRoadmap,
       };
 
       await generateEnterpriseModulesAuditPDF(config);
 
       clearInterval(progressInterval);
       setProgress(100);
 
       toast.success('Informe de auditoria generado correctamente', {
         description: 'El PDF se ha descargado automaticamente',
       });
     } catch (error) {
       console.error('Error generating audit PDF:', error);
       toast.error('Error al generar el informe', {
         description: error instanceof Error ? error.message : 'Error desconocido',
       });
     } finally {
       setTimeout(() => {
         setIsGenerating(false);
         setProgress(0);
       }, 500);
     }
   };
 
   const getStatusBadge = (status: ModuleStats['status']) => {
     switch (status) {
       case 'complete':
         return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Completo</Badge>;
       case 'advanced':
         return <Badge variant="default" className="bg-primary hover:bg-primary/90">Avanzado</Badge>;
       case 'innovation':
         return <Badge variant="default" className="bg-accent hover:bg-accent/90">Innovacion</Badge>;
     }
   };
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
         <CardHeader>
           <div className="flex items-center gap-3">
             <div className="p-3 rounded-xl bg-primary text-primary-foreground">
               <FileText className="h-6 w-6" />
             </div>
             <div>
               <CardTitle className="text-xl">Generador de Auditoria Enterprise</CardTitle>
               <CardDescription>
                 Informe detallado de modulos RRHH, Fiscal y Juridico con benchmark competitivo
               </CardDescription>
             </div>
           </div>
         </CardHeader>
       </Card>
 
       {/* Module Overview */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {MODULE_STATS.map((module) => (
           <Card key={module.name} className="hover:shadow-md transition-shadow">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="p-2 rounded-lg bg-muted">{module.icon}</div>
                   <CardTitle className="text-base">{module.name}</CardTitle>
                 </div>
                 {getStatusBadge(module.status)}
               </div>
             </CardHeader>
             <CardContent>
               <div className="flex gap-4 mb-3 text-sm">
                 <div className="flex items-center gap-1">
                   <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                   <span>{module.features} funciones</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <Sparkles className="h-4 w-4 text-accent" />
                   <span>{module.edgeFunctions} agentes IA</span>
                 </div>
               </div>
               <ul className="text-xs text-muted-foreground space-y-1">
                 {module.highlights.map((h, idx) => (
                   <li key={idx} className="flex items-center gap-1">
                     <span className="w-1 h-1 rounded-full bg-primary" />
                     {h}
                   </li>
                 ))}
               </ul>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Configuration */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Configuracion del Informe</CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Module Selection */}
           <div>
             <label className="text-sm font-medium mb-2 block">Modulos a Incluir</label>
             <Tabs value={selectedModules} onValueChange={(v) => setSelectedModules(v as AuditReportType)}>
               <TabsList className="grid grid-cols-4 w-full max-w-md">
                 <TabsTrigger value="all">Todos</TabsTrigger>
                 <TabsTrigger value="rrhh">RRHH</TabsTrigger>
                 <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
                 <TabsTrigger value="legal">Juridico</TabsTrigger>
               </TabsList>
             </Tabs>
           </div>
 
           {/* Detail Level */}
           <div>
             <label className="text-sm font-medium mb-2 block">Nivel de Detalle</label>
             <Tabs value={detailLevel} onValueChange={(v) => setDetailLevel(v as DetailLevel)}>
               <TabsList className="grid grid-cols-3 w-full max-w-md">
                 <TabsTrigger value="executive">Ejecutivo</TabsTrigger>
                 <TabsTrigger value="detailed">Detallado</TabsTrigger>
                 <TabsTrigger value="complete">Completo</TabsTrigger>
               </TabsList>
             </Tabs>
             <p className="text-xs text-muted-foreground mt-1">
               {detailLevel === 'executive' && 'Resumen de alto nivel (~20 paginas)'}
               {detailLevel === 'detailed' && 'Analisis con tablas y comparativas (~50 paginas)'}
               {detailLevel === 'complete' && 'Documentacion exhaustiva (~80+ paginas)'}
             </p>
           </div>
 
           {/* Options */}
           <div className="flex flex-wrap gap-4">
             <label className="flex items-center gap-2 cursor-pointer">
               <input
                 type="checkbox"
                 checked={includeCompetitorAnalysis}
                 onChange={(e) => setIncludeCompetitorAnalysis(e.target.checked)}
                 className="rounded border-gray-300"
               />
               <span className="text-sm flex items-center gap-1">
                 <TrendingUp className="h-4 w-4" />
                 Analisis Competitivo
               </span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input
                 type="checkbox"
                 checked={includeRoadmap}
                 onChange={(e) => setIncludeRoadmap(e.target.checked)}
                 className="rounded border-gray-300"
               />
               <span className="text-sm flex items-center gap-1">
                 <Globe className="h-4 w-4" />
                 Roadmap 2026-2027
               </span>
             </label>
           </div>
 
           {/* Estimated Content */}
           <div className="bg-muted/50 rounded-lg p-4">
             <h4 className="font-medium mb-2 flex items-center gap-2">
               <Shield className="h-4 w-4" />
               Contenido Estimado del Informe
             </h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
               <div>
                 <span className="text-muted-foreground">Paginas:</span>
                 <p className="font-medium">
                   {detailLevel === 'executive' ? '~20' : detailLevel === 'detailed' ? '~50' : '~80+'}
                 </p>
               </div>
               <div>
                 <span className="text-muted-foreground">Tablas:</span>
                 <p className="font-medium">{selectedModules === 'all' ? '15+' : '5+'}</p>
               </div>
               <div>
                 <span className="text-muted-foreground">Comparativas:</span>
                 <p className="font-medium">{includeCompetitorAnalysis ? 'Si' : 'No'}</p>
               </div>
               <div>
                 <span className="text-muted-foreground">Roadmap:</span>
                 <p className="font-medium">{includeRoadmap ? 'Si' : 'No'}</p>
               </div>
             </div>
           </div>
 
           {/* Progress */}
           {isGenerating && (
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span>Generando informe...</span>
                 <span>{progress}%</span>
               </div>
               <Progress value={progress} className="h-2" />
             </div>
           )}
 
           {/* Generate Button */}
           <Button
             size="lg"
             onClick={handleGenerate}
             disabled={isGenerating}
             className="w-full md:w-auto"
           >
             {isGenerating ? (
               <>
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 Generando...
               </>
             ) : (
               <>
                 <Download className="h-4 w-4 mr-2" />
                 Generar Informe PDF
               </>
             )}
           </Button>
         </CardContent>
       </Card>
 
       {/* Info */}
       <Card className="bg-primary/5 border-primary/20">
         <CardContent className="pt-6">
           <div className="flex gap-3">
             <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
             <div className="text-sm">
               <p className="font-medium text-foreground mb-1">
                 Informe de Auditoria Enterprise
               </p>
               <p className="text-muted-foreground">
                 Este informe proporciona un analisis exhaustivo de los modulos RRHH, Fiscal y Juridico, 
                 comparando sus funcionalidades con los lideres mundiales (SAP SuccessFactors, Workday, 
                 Oracle Cloud HCM, Icertis CLM). Incluye posicion competitiva honesta, fortalezas, 
                 gaps identificados y roadmap de evolucion.
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }
 
 export default EnterpriseModulesAuditGenerator;