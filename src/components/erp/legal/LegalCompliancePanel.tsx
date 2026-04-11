/**
 * LegalCompliancePanel - Matriz de cumplimiento normativo multi-jurisdiccional
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalCompliancePanelProps {
  companyId: string;
}

interface ComplianceItem {
  id: string;
  regulation: string;
  jurisdiction: string;
  category: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'pending';
  score: number;
  lastChecked: string;
  nextReview: string;
  actions: string[];
}

const JURISDICTIONS = ['AD', 'ES', 'EU', 'INT'];

const DemoBadge = () => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
    Datos de ejemplo
  </Badge>
);

export function LegalCompliancePanel({ companyId }: LegalCompliancePanelProps) {
  const [activeJurisdiction, setActiveJurisdiction] = useState('ES');
  const [isChecking, setIsChecking] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([
    {
      id: '1',
      regulation: 'GDPR',
      jurisdiction: 'EU',
      category: 'Protección de Datos',
      status: 'compliant',
      score: 95,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      actions: []
    },
    {
      id: '2',
      regulation: 'MiFID II',
      jurisdiction: 'EU',
      category: 'Servicios Financieros',
      status: 'partial',
      score: 78,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      actions: ['Actualizar documentación de transparencia', 'Revisar políticas de costes']
    },
    {
      id: '3',
      regulation: 'DORA',
      jurisdiction: 'EU',
      category: 'Resiliencia Digital',
      status: 'pending',
      score: 45,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      actions: ['Implementar plan de continuidad', 'Documentar procesos de recuperación', 'Realizar tests de resiliencia']
    },
    {
      id: '4',
      regulation: 'APDA',
      jurisdiction: 'AD',
      category: 'Protección de Datos',
      status: 'compliant',
      score: 92,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      actions: []
    },
    {
      id: '5',
      regulation: 'PSD2/PSD3',
      jurisdiction: 'EU',
      category: 'Pagos',
      status: 'partial',
      score: 82,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      actions: ['Actualizar APIs de banca abierta']
    },
    {
      id: '6',
      regulation: 'Ley 15/2010',
      jurisdiction: 'ES',
      category: 'Morosidad',
      status: 'compliant',
      score: 100,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      actions: []
    },
    {
      id: '7',
      regulation: 'Basel III/IV',
      jurisdiction: 'INT',
      category: 'Capital',
      status: 'compliant',
      score: 88,
      lastChecked: new Date().toISOString(),
      nextReview: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      actions: []
    }
  ]);

  const getStatusIcon = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-600">Cumple</Badge>;
      case 'partial':
        return <Badge className="bg-amber-600">Parcial</Badge>;
      case 'non_compliant':
        return <Badge variant="destructive">No Cumple</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const filteredItems = complianceItems.filter(
    item => activeJurisdiction === 'ALL' || item.jurisdiction === activeJurisdiction
  );

  const overallScore = Math.round(
    filteredItems.reduce((acc, item) => acc + item.score, 0) / filteredItems.length
  );

  const handleRunCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'run_compliance_check',
          context: { companyId, jurisdiction: activeJurisdiction }
        }
      });

      if (error) throw error;
      toast.success('Verificación de compliance completada');
    } catch (error) {
      console.error('Error running compliance check:', error);
      toast.error('Error al ejecutar verificación');
    } finally {
      setIsChecking(false);
    }
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = {
      'AD': '🇦🇩',
      'ES': '🇪🇸',
      'EU': '🇪🇺',
      'INT': '🌍',
      'ALL': '🌐'
    };
    return flags[code] || '🏳️';
  };

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Matriz de Cumplimiento
            <DemoBadge />
          </h2>
          <p className="text-sm text-muted-foreground">
            Estado de cumplimiento normativo multi-jurisdiccional
          </p>
        </div>
        <Button onClick={handleRunCheck} disabled={isChecking}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Verificar Ahora
        </Button>
      </div>

      {/* Score global */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Score Global de Compliance</p>
              <p className="text-3xl font-bold">{overallScore}%</p>
            </div>
            <div className="w-48">
              <Progress value={overallScore} className="h-3" />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{filteredItems.filter(i => i.status === 'compliant').length} Cumple</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>{filteredItems.filter(i => i.status === 'partial').length} Parcial</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{filteredItems.filter(i => i.status === 'non_compliant').length} No Cumple</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{filteredItems.filter(i => i.status === 'pending').length} Pendiente</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por jurisdicción */}
      <Tabs value={activeJurisdiction} onValueChange={setActiveJurisdiction}>
        <TabsList>
          <TabsTrigger value="ALL">{getJurisdictionFlag('ALL')} Todas</TabsTrigger>
          {JURISDICTIONS.map((j) => (
            <TabsTrigger key={j} value={j}>
              {getJurisdictionFlag(j)} {j}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeJurisdiction} className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{item.regulation}</h3>
                            {getStatusBadge(item.status)}
                            <Badge variant="outline">
                              {getJurisdictionFlag(item.jurisdiction)} {item.jurisdiction}
                            </Badge>
                          </div>
                          <span className="text-lg font-bold">{item.score}%</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.category}
                        </p>

                        <Progress value={item.score} className="h-2 mb-3" />

                        {item.actions.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              Acciones Requeridas:
                            </p>
                            <ul className="text-xs space-y-1">
                              {item.actions.map((action, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>Última verificación: {new Date(item.lastChecked).toLocaleDateString()}</span>
                          <span>Próxima revisión: {new Date(item.nextReview).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalCompliancePanel;
