/**
 * Fiscal Module - Módulo principal que integra SII, Intrastat, Jurisdicciones Globales,
 * Agente IA Fiscal y Ayuda Activa
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
} from 'lucide-react';
import { SIIDashboard } from './SIIDashboard';
import { IntrastatDashboard } from './IntrastatDashboard';
import { GlobalTaxDashboard } from './GlobalTaxDashboard';
import { FiscalAIAgentPanel } from './FiscalAIAgentPanel';
import { ActiveHelpPanel } from './ActiveHelpPanel';
import { useERPSII } from '@/hooks/erp/useERPSII';
import { useERPIntrastat } from '@/hooks/erp/useERPIntrastat';

export function FiscalModule() {
  const [activeModule, setActiveModule] = useState('sii');
  
  // Demo company ID for testing
  const demoCompanyId = 'demo-company-001';
  
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
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
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
            Jurisdicciones
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-2">
            <Brain className="h-4 w-4" />
            Agente IA
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Ayuda Activa
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

        <TabsContent value="agent" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <FiscalAIAgentPanel 
              companyId={demoCompanyId} 
              className="min-h-[600px]"
            />
            <ActiveHelpPanel 
              companyId={demoCompanyId}
              className="min-h-[600px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <ActiveHelpPanel 
            companyId={demoCompanyId}
            className="max-w-3xl mx-auto min-h-[600px]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FiscalModule;
