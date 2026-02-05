/**
 * Unified Audit Generators Component
 * Supports ERP, CRM, and Combined audit reports
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, Loader2, Users, Calculator, Scale, CheckCircle,
  TrendingUp, Shield, Sparkles, Building2, Globe, Target, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { generateAuditPDF, getModuleStats, type AuditConfig, type AuditScope, type DetailLevel } from '@/lib/auditPDF';

interface Props {
  defaultScope?: AuditScope;
}

export function UnifiedAuditGenerator({ defaultScope = 'erp' }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scope, setScope] = useState<AuditScope>(defaultScope);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('detailed');
  const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState(true);
  const [includeRoadmap, setIncludeRoadmap] = useState(true);

  const moduleStats = getModuleStats(scope);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const config: AuditConfig = {
        scope,
        detailLevel,
        includeCharts: true,
        includeCompetitorAnalysis,
        includeRoadmap,
        includeTechnicalDetails: detailLevel === 'complete',
      };

      await generateAuditPDF(config);

      clearInterval(progressInterval);
      setProgress(100);

      toast.success('Informe de auditoria generado correctamente', {
        description: 'El PDF se ha descargado automaticamente',
      });
    } catch (error) {
      console.error('Error generating audit PDF:', error);
      toast.error('Error al generar el informe');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  const getScopeIcon = () => {
    switch (scope) {
      case 'crm': return <Target className="h-6 w-6" />;
      case 'erp': return <Building2 className="h-6 w-6" />;
      case 'combined': return <Layers className="h-6 w-6" />;
    }
  };

  const getScopeTitle = () => {
    switch (scope) {
      case 'crm': return 'CRM Universal';
      case 'erp': return 'ERP Enterprise (HR, Fiscal, Legal)';
      case 'combined': return 'Suite Integral CRM + ERP';
    }
  };

  const getStatusBadge = (status: 'complete' | 'advanced' | 'innovation') => {
    switch (status) {
      case 'complete': return <Badge className="bg-emerald-600">Completo</Badge>;
      case 'advanced': return <Badge className="bg-primary">Avanzado</Badge>;
      case 'innovation': return <Badge className="bg-accent">Innovacion</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary text-primary-foreground">
              {getScopeIcon()}
            </div>
            <div>
              <CardTitle className="text-xl">Generador de Auditoria - {getScopeTitle()}</CardTitle>
              <CardDescription>
                Informe detallado con benchmark competitivo y roadmap
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Scope Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Alcance del Informe</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={scope} onValueChange={(v) => setScope(v as AuditScope)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="erp" className="gap-2">
                <Building2 className="h-4 w-4" />
                ERP
              </TabsTrigger>
              <TabsTrigger value="crm" className="gap-2">
                <Target className="h-4 w-4" />
                CRM
              </TabsTrigger>
              <TabsTrigger value="combined" className="gap-2">
                <Layers className="h-4 w-4" />
                CRM + ERP
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {moduleStats.map((module) => (
          <Card key={module.code} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{module.name}</CardTitle>
                {getStatusBadge(module.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{module.features} funciones</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>{module.edgeFunctions} agentes IA</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {module.highlights.slice(0, 4).map((h, idx) => (
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
          <CardTitle className="text-lg">Configuracion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detail Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nivel de Detalle</label>
            <Tabs value={detailLevel} onValueChange={(v) => setDetailLevel(v as DetailLevel)}>
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="executive">Ejecutivo (~20 pags)</TabsTrigger>
                <TabsTrigger value="detailed">Detallado (~50 pags)</TabsTrigger>
                <TabsTrigger value="complete">Completo (~80+ pags)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCompetitorAnalysis}
                onChange={(e) => setIncludeCompetitorAnalysis(e.target.checked)}
                className="rounded"
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
                className="rounded"
              />
              <span className="text-sm flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Roadmap 2026-2027
              </span>
            </label>
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
          <Button size="lg" onClick={handleGenerate} disabled={isGenerating} className="w-full md:w-auto">
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Generar Informe PDF</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnifiedAuditGenerator;
