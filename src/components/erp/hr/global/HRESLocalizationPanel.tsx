/**
 * HRESLocalizationPanel — Plugin de localización España
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag, Calculator, Landmark, FileText, Calendar, Users, ArrowRight } from 'lucide-react';

interface Props { companyId: string; onNavigate?: (module: string) => void; }

export function HRESLocalizationPanel({ companyId, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5" /> 🇪🇸 Localización España
        </h3>
        <p className="text-sm text-muted-foreground">Reglas fiscales, SS, tipos de contrato, permisos y convenios</p>
      </div>

      <Tabs defaultValue="irpf">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="irpf" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> IRPF</TabsTrigger>
          <TabsTrigger value="ss" className="text-xs gap-1"><Landmark className="h-3.5 w-3.5" /> Seg. Social</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Contratos</TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs gap-1"><Calendar className="h-3.5 w-3.5" /> Permisos</TabsTrigger>
          <TabsTrigger value="agreements" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /> Convenios</TabsTrigger>
        </TabsList>

        <TabsContent value="irpf">
          <Card>
            <CardHeader><CardTitle className="text-sm">Tramos IRPF 2026</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { from: 0, to: 12450, rate: 19 },
                  { from: 12450, to: 20200, rate: 24 },
                  { from: 20200, to: 35200, rate: 30 },
                  { from: 35200, to: 60000, rate: 37 },
                  { from: 60000, to: 300000, rate: 45 },
                  { from: 300000, to: null, rate: 47 },
                ].map((t, i) => (
                  <div key={i} className="flex justify-between p-2 rounded border">
                    <span>{t.from.toLocaleString()}€ — {t.to ? `${t.to.toLocaleString()}€` : 'En adelante'}</span>
                    <Badge variant="secondary">{t.rate}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ss">
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Bases y tipos de cotización por grupo — Próximamente</CardContent></Card>
        </TabsContent>
        <TabsContent value="contracts">
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Tipos de contrato según RD — Próximamente</CardContent></Card>
        </TabsContent>
        <TabsContent value="leaves">
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Permisos ET y convenio — Próximamente</CardContent></Card>
        </TabsContent>
        <TabsContent value="agreements">
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Motor de convenios colectivos con tablas salariales, resolución de condiciones y detección de conflictos.</p>
              {onNavigate ? (
                <Button variant="outline" size="sm" onClick={() => onNavigate('collective-agreements')}>
                  Abrir Convenios Colectivos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Accede desde Global → Oficial & Compliance → Convenios Colectivos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
