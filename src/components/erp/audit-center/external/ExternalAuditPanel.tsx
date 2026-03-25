/**
 * ExternalAuditPanel — Gestión de auditoría externa y regulatoria
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, FileText, Shield, Clock, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ExternalAuditPanel() {
  const { submissions, fetchSubmissions } = useUnifiedAudit();
  const [subTab, setSubTab] = useState('submissions');

  useEffect(() => { fetchSubmissions(); }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-emerald-500/10 text-emerald-600';
      case 'draft': return 'bg-amber-500/10 text-amber-600';
      case 'pending_review': return 'bg-blue-500/10 text-blue-600';
      case 'overdue': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Auditoría Externa</h3>
          <p className="text-sm text-muted-foreground">
            Gestión de requerimientos regulatorios, evidencias y envíos a BdE, BCE, AEPD
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Upload className="h-4 w-4" /> Nuevo Envío
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="submissions" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Envíos</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Evidencias</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /> Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Envíos Regulatorios</CardTitle>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay envíos regulatorios registrados</p>
                  <p className="text-xs text-muted-foreground mt-1">Los agentes IA generarán borradores automáticamente</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{sub.submission_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.regulator} · {sub.reference_code || 'Sin referencia'}
                            </p>
                          </div>
                          <Badge className={statusColor(sub.status)}>{sub.status}</Badge>
                        </div>
                        {sub.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Plazo: {formatDistanceToNow(new Date(sub.deadline), { locale: es, addSuffix: true })}
                          </p>
                        )}
                        {sub.ai_agent_code && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Generado por {sub.ai_agent_code} · Confianza {sub.ai_confidence}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Panel de gestión de evidencias. El agente AUDIT-AGT-007 clasifica y vincula evidencias automáticamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Calendario regulatorio con plazos de BdE, BCE, AEPD y deadlines de auditorías externas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Regulators summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'Banco de España', code: 'BdE', icon: '🏦', pending: submissions.filter(s => s.regulator === 'BdE' && s.status !== 'submitted').length },
          { name: 'BCE', code: 'BCE', icon: '🇪🇺', pending: submissions.filter(s => s.regulator === 'BCE' && s.status !== 'submitted').length },
          { name: 'AEPD', code: 'AEPD', icon: '🔒', pending: submissions.filter(s => s.regulator === 'AEPD' && s.status !== 'submitted').length },
        ].map(reg => (
          <Card key={reg.code} className="border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl mb-1">{reg.icon}</p>
              <p className="text-xs font-medium">{reg.name}</p>
              <Badge variant={reg.pending > 0 ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                {reg.pending > 0 ? `${reg.pending} pendientes` : 'Al día'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
