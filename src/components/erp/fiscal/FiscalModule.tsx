/**
 * Fiscal Module - Módulo principal que integra SII, Intrastat, Jurisdicciones Globales,
 * Agente IA Fiscal, Ayuda Activa, Acciones Fiscales, Tendencias 2026+, Noticias y Conocimiento
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Globe,
  AlertCircle,
  TrendingUp,
  Brain,
  HelpCircle,
  Rocket,
  Newspaper,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { SIIDashboard } from './SIIDashboard';
import { IntrastatDashboard } from './IntrastatDashboard';
import { GlobalTaxDashboard } from './GlobalTaxDashboard';
import { FiscalAIAgentPanel } from './FiscalAIAgentPanel';
import { ActiveHelpPanel } from './ActiveHelpPanel';
import { FiscalActionsPanel } from './FiscalActionsPanel';
import { FiscalTrends2026Panel } from './FiscalTrends2026Panel';
import { FiscalNewsPanel } from './FiscalNewsPanel';
import { FiscalKnowledgeUploader } from './FiscalKnowledgeUploader';
import { FiscalVoiceButton } from './FiscalVoiceButton';
import { useERPSII } from '@/hooks/erp/useERPSII';
import { useERPIntrastat } from '@/hooks/erp/useERPIntrastat';
import { useOptionalERPContext } from '@/hooks/erp/useERPContext';

export function FiscalModule() {
  const [activeModule, setActiveModule] = useState('sii');
  
  // Use real company ID from ERP context, fallback to demo
  const erpContext = useOptionalERPContext();
  const companyId = erpContext?.currentCompany?.id || 'demo-company-001';
  
  const { stats: siiStats } = useERPSII();
  const { stats: intrastatStats } = useERPIntrastat();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SII Pendientes</p>
                <p className="text-2xl font-bold">{siiStats.pending + siiStats.generated}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SII Rechazados</p>
                <p className="text-2xl font-bold">{siiStats.rejected}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Intrastat Expediciones</p>
                <p className="text-2xl font-bold">{formatCurrency(intrastatStats.dispatchesThisMonth)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Intrastat Introducciones</p>
                <p className="text-2xl font-bold">{formatCurrency(intrastatStats.arrivalsThisMonth)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeModule} onValueChange={setActiveModule}>
        <TabsList className="grid w-full max-w-6xl grid-cols-9">
          <TabsTrigger value="sii" className="gap-2">
            <FileText className="h-4 w-4" />
            SII
            {(siiStats.pending + siiStats.rejected) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {siiStats.pending + siiStats.rejected}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="intrastat" className="gap-2">
            <Globe className="h-4 w-4" />
            Intrastat
            {intrastatStats.pendingDeclarations > 0 && (
              <Badge variant="secondary" className="ml-1">
                {intrastatStats.pendingDeclarations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jurisdictions" className="gap-2">
            <Globe className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-2">
            <Brain className="h-4 w-4" />
            Agente IA
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Noticias
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Conocimiento
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Ayuda
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <Rocket className="h-4 w-4" />
            2026+
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sii" className="mt-6">
          <SIIDashboard />
        </TabsContent>

        <TabsContent value="intrastat" className="mt-6">
          <IntrastatDashboard />
        </TabsContent>

        <TabsContent value="jurisdictions" className="mt-6">
          <GlobalTaxDashboard />
        </TabsContent>

        <TabsContent value="actions" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <FiscalActionsPanel 
              companyId={companyId}
              className="min-h-[500px]"
            />
            <Card className="p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Documentación Generada</h3>
                  <p className="text-xs text-muted-foreground">Historial y presentaciones</p>
                </div>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Los documentos generados aparecerán aquí</p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agent" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FiscalAIAgentPanel 
                companyId={companyId} 
                className="min-h-[600px]"
              />
              {/* Voice Controls */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Control por Voz</h4>
                    <p className="text-xs text-muted-foreground">Habla con el agente fiscal</p>
                  </div>
                  <FiscalVoiceButton
                    onTranscript={(text) => console.log('Voice transcript:', text)}
                    autoSpeak={true}
                  />
                </div>
              </Card>
            </div>
            <ActiveHelpPanel 
              companyId={companyId}
              className="min-h-[600px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="news" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FiscalNewsPanel 
                companyId={companyId}
                companyCnae="6201"
                className="min-h-[600px]"
              />
            </div>
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium">Noticias Fiscales</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Monitorización automática de cambios normativos que afectan a tu empresa según CNAE.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Guarda noticias importantes</li>
                  <li>• Añade a base de conocimiento</li>
                  <li>• Implementa cambios automáticamente</li>
                </ul>
              </Card>
              <FiscalKnowledgeUploader className="min-h-[300px]" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <FiscalKnowledgeUploader className="min-h-[500px]" />
            <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Base de Conocimiento Fiscal</h3>
                  <p className="text-xs text-muted-foreground">Documentación y normativas</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">Regulaciones</h4>
                  <p className="text-xs text-muted-foreground">Leyes fiscales, circulares y BOE</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">Plantillas</h4>
                  <p className="text-xs text-muted-foreground">Modelos oficiales AEAT</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-1">Noticias Guardadas</h4>
                  <p className="text-xs text-muted-foreground">Artículos relevantes para tu CNAE</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <ActiveHelpPanel 
            companyId={companyId}
            className="max-w-3xl mx-auto min-h-[600px]"
          />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <FiscalTrends2026Panel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FiscalModule;
