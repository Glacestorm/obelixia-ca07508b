/**
 * FiscalTrends2026Panel - Panel de tendencias fiscales disruptivas 2026-2030
 * e-Invoicing, ViDA, Tax API, IA Predictiva, Blockchain
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  FileCode,
  Globe,
  Bot,
  Link2,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Blocks
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FiscalTrends2026PanelProps {
  className?: string;
}

interface TrendItem {
  id: string;
  title: string;
  description: string;
  year: number;
  status: 'active' | 'upcoming' | 'future';
  readiness: number;
  icon: typeof Zap;
  jurisdiction: string;
  features: string[];
}

const TRENDS: TrendItem[] = [
  {
    id: 'einvoicing',
    title: 'Facturación Electrónica B2B',
    description: 'Obligatoriedad de factura electrónica estructurada entre empresas en España',
    year: 2026,
    status: 'upcoming',
    readiness: 65,
    icon: FileCode,
    jurisdiction: 'España',
    features: [
      'Formato Facturae 3.2.2',
      'Validación automática de contenido',
      'Firma electrónica XAdES',
      'Transmisión a FACe/FACeB2B'
    ]
  },
  {
    id: 'vida',
    title: 'ViDA - VAT in the Digital Age',
    description: 'Reporte en tiempo real de transacciones transfronterizas en la UE',
    year: 2028,
    status: 'future',
    readiness: 25,
    icon: Globe,
    jurisdiction: 'Unión Europea',
    features: [
      'Registro único de IVA (OSS+)',
      'Reporting digital en tiempo real',
      'Eliminación de listings recapitulativos',
      'Interoperabilidad transfronteriza'
    ]
  },
  {
    id: 'tax-api',
    title: 'Tax API Direct',
    description: 'Conexión directa API con administraciones tributarias',
    year: 2027,
    status: 'upcoming',
    readiness: 40,
    icon: Link2,
    jurisdiction: 'Multi-jurisdicción',
    features: [
      'API REST AEAT/HMRC/IRS',
      'Webhooks de notificaciones',
      'Firma digital integrada',
      'Certificados automatizados'
    ]
  },
  {
    id: 'ai-fiscal',
    title: 'IA Fiscal Predictiva',
    description: 'Predicción de obligaciones y optimización fiscal asistida por IA',
    year: 2026,
    status: 'active',
    readiness: 80,
    icon: Bot,
    jurisdiction: 'Global',
    features: [
      'Predicción de riesgos fiscales',
      'Alertas de cambios normativos',
      'Optimización de deducciones',
      'Simulación de escenarios'
    ]
  },
  {
    id: 'blockchain',
    title: 'Blockchain Fiscal',
    description: 'Trazabilidad y prueba de presentación mediante tecnología blockchain',
    year: 2029,
    status: 'future',
    readiness: 15,
    icon: Blocks,
    jurisdiction: 'Experimental',
    features: [
      'Hash inmutable de documentos',
      'Proof-of-Filing timestamping',
      'Smart contracts tributarios',
      'Auditoría automatizada'
    ]
  }
];

export function FiscalTrends2026Panel({ className }: FiscalTrends2026PanelProps) {
  const [selectedTrend, setSelectedTrend] = useState<string>('einvoicing');
  const activeTrend = TRENDS.find(t => t.id === selectedTrend);

  const getStatusBadge = (status: TrendItem['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Activo</Badge>;
      case 'upcoming':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Próximo</Badge>;
      case 'future':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Futuro</Badge>;
    }
  };

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 70) return 'bg-green-500';
    if (readiness >= 40) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Tendencias Fiscales 2026-2030
                <Badge variant="outline" className="text-[10px]">Innovación</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Preparación para el futuro fiscal digital
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline visual */}
        <div className="flex items-center justify-between px-2 py-3 bg-muted/30 rounded-lg">
          {[2026, 2027, 2028, 2029, 2030].map((year, idx) => (
            <div key={year} className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                year === 2026 ? "bg-green-500 text-white" :
                year <= 2027 ? "bg-amber-500 text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {year.toString().slice(-2)}
              </div>
              <span className="text-[10px] mt-1 text-muted-foreground">{year}</span>
            </div>
          ))}
        </div>

        {/* Tendencias */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {TRENDS.map((trend) => {
              const Icon = trend.icon;
              const isSelected = selectedTrend === trend.id;

              return (
                <div
                  key={trend.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedTrend(trend.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      trend.status === 'active' ? "bg-green-500/10" :
                      trend.status === 'upcoming' ? "bg-amber-500/10" :
                      "bg-blue-500/10"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        trend.status === 'active' ? "text-green-600" :
                        trend.status === 'upcoming' ? "text-amber-600" :
                        "text-blue-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{trend.title}</h4>
                        {getStatusBadge(trend.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {trend.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {trend.jurisdiction} • {trend.year}
                        </span>
                        <div className="flex-1">
                          <Progress 
                            value={trend.readiness} 
                            className={cn("h-1.5", getReadinessColor(trend.readiness))}
                          />
                        </div>
                        <span className="text-[10px] font-medium">{trend.readiness}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Detalle de tendencia seleccionada */}
        {activeTrend && (
          <div className="p-3 rounded-lg border bg-muted/20">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Características de {activeTrend.title}
            </h4>
            <ul className="space-y-1">
              {activeTrend.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
              <ArrowRight className="h-4 w-4" />
              Preparar implementación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FiscalTrends2026Panel;
