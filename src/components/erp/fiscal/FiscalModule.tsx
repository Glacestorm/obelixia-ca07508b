/**
 * Fiscal Module - Módulo principal que integra SII e Intrastat
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Globe,
  Receipt,
  Calculator,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { SIIDashboard } from './SIIDashboard';
import { IntrastatDashboard } from './IntrastatDashboard';
import { useERPSII } from '@/hooks/erp/useERPSII';
import { useERPIntrastat } from '@/hooks/erp/useERPIntrastat';

export function FiscalModule() {
  const [activeModule, setActiveModule] = useState('sii');
  
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
        </TabsList>

        <TabsContent value="sii" className="mt-6">
          <SIIDashboard />
        </TabsContent>

        <TabsContent value="intrastat" className="mt-6">
          <IntrastatDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FiscalModule;
