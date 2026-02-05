/**
 * Unified Audit Generators Component
 * Supports ERP, CRM, and Combined audit reports
 * Now includes Economic Valuation and Commercial Proposals
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, Loader2, CheckCircle,
  TrendingUp, Sparkles, Building2, Globe, Target, Layers, Euro, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  generateAuditPDF, 
  getModuleStats, 
  getCRMValuationSummary,
  getERPValuationSummary,
  getCombinedValuationSummary,
  type AuditConfig, 
  type AuditScope, 
  type DetailLevel 
} from '@/lib/auditPDF';

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
  
  // Economic valuation data
  const valuation = useMemo(() => {
    switch (scope) {
      case 'crm': {
        const s = getCRMValuationSummary();
        return {
          marketValue: s.totalMarketValue,
          competitorPrice: s.totalCompetitorPrice,
          devHours: s.totalDevHours,
          aiPremium: s.totalAIPremium,
          perpetualPrice: 320000,
        };
      }
      case 'erp': {
        const s = getERPValuationSummary();
        return {
          marketValue: s.total.totalMarketValue,
          competitorPrice: s.total.totalCompetitorPrice,
          devHours: s.total.totalDevHours,
          aiPremium: s.total.totalAIPremium,
          perpetualPrice: 580000,
        };
      }
      case 'combined': {
        const s = getCombinedValuationSummary();
        return {
          marketValue: s.grandTotal.totalMarketValue,
          competitorPrice: s.grandTotal.totalCompetitorPrice,
          devHours: s.grandTotal.totalDevHours,
          aiPremium: s.grandTotal.totalAIPremium,
          perpetualPrice: 880000,
        };
      }
    }
  }, [scope]);

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
        description: 'Incluye valoracion economica y propuesta comercial',
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

  const formatEUR = (value: number) => `EUR ${value.toLocaleString('es-ES')}`;
  const savingsPercent = Math.round(((valuation.marketValue - valuation.perpetualPrice) / valuation.marketValue) * 100);

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
                Informe completo con valoracion economica, benchmark competitivo y propuesta comercial
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

      {/* Economic Valuation Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Valoracion Economica</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground">Valor de Mercado</p>
              <p className="text-lg font-bold text-primary">{formatEUR(valuation.marketValue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground">Precio Competencia</p>
              <p className="text-lg font-bold">{formatEUR(valuation.competitorPrice)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground">Licencia Perpetua</p>
              <p className="text-lg font-bold text-emerald-600">{formatEUR(valuation.perpetualPrice)}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" /> Descuento
              </p>
              <p className="text-lg font-bold text-emerald-600">{savingsPercent}%</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="font-medium">Prima IA incluida:</span>
              <span className="text-accent font-bold">{formatEUR(valuation.aiPremium)}</span>
              <span className="text-muted-foreground">({Math.round(valuation.aiPremium / valuation.marketValue * 100)}% del valor)</span>
            </div>
          </div>
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
          <CardTitle className="text-lg">Configuracion del Informe</CardTitle>
          <CardDescription>
            El informe incluye automaticamente: Valoracion Economica detallada y Propuesta Comercial con tarifas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detail Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nivel de Detalle</label>
            <Tabs value={detailLevel} onValueChange={(v) => setDetailLevel(v as DetailLevel)}>
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="executive">Ejecutivo (~30 pags)</TabsTrigger>
                <TabsTrigger value="detailed">Detallado (~60 pags)</TabsTrigger>
                <TabsTrigger value="complete">Completo (~100+ pags)</TabsTrigger>
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

          {/* What's included */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-2">El informe PDF incluye:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Inventario completo de funcionalidades
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Edge Functions y Hooks implementados
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Valoracion economica detallada por modulo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Propuesta comercial con planes y tarifas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Descuentos por volumen y licencias perpetuas
              </li>
            </ul>
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
              <><Download className="h-4 w-4 mr-2" />Generar Informe PDF Completo</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnifiedAuditGenerator;
